/**
 * Content script for scraping GitHub Stars page and individual star lists
 * Runs in the context of github.com pages and can access the DOM
 */

import { GitHubList, GitHubRepository, ContentScriptMessage, ScrapeResult } from '../shared/types';
import { createListId } from '../shared/utils';

// ============================================================
// VALIDATION & NORMALIZATION HELPERS
// ============================================================

// Debug counters for monitoring
let debugCounters = {
  skippedInvalidListUrls: 0,
  skippedInvalidRepos: 0,
  fetchedListPages: 0,
  throttledOrRateLimitedCount: 0,
  actualRateLimitHit: false
};

/**
 * Normalize list name - trim, collapse whitespace, remove common prefixes, clamp length
 */
function normalizeListName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(List:|★\s*)/i, '')
    .trim()
    .substring(0, 80);
}

/**
 * Validate list URL - must be https://github.com and contain /stars/ and /lists/
 * Allow optional trailing slash and ignore query/hash
 */
function isValidListUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
           parsed.hostname === 'github.com' &&
           parsed.pathname.includes('/stars/') &&
           parsed.pathname.includes('/lists/');
  } catch {
    return false;
  }
}

/**
 * Normalize repo href to full name (owner/repo)
 */
function normalizeRepoHrefToFullName(href: string): string | null {
  const match = href.match(/^\/([^/]+)\/([^/]+)(?:\/.*)?$/);
  if (!match) return null;
  
  const [, owner, repo] = match;
  
  // Reject system/meta pages
  const denylist = ['settings', 'notifications', 'pulls', 'issues', 'marketplace', 'explore'];
  if (denylist.includes(owner)) return null;
  
  // Validate format
  const fullName = `${owner}/${repo}`;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) return null;
  
  return fullName;
}

/**
 * Normalize repo URL from href
 */
function normalizeRepoUrlFromHref(href: string, fullName: string): string {
  const [owner, repo] = fullName.split('/');
  return `https://github.com/${owner}/${repo}`;
}

/**
 * Fetch HTML with timeout and basic error handling
 */
async function fetchHtmlWithTimeout(url: string, timeoutMs: number = 20000): Promise<{ok: boolean, status: number, text?: string, isRateLimit?: boolean}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      credentials: 'same-origin', // Changed from 'include' to 'same-origin'
      headers: {
        'Accept': 'text/html,application/xhtml+xml'
        // Removed 'User-Agent' header as it's forbidden in browser fetch
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Check if this is a rate limiting response
      let isRateLimit = false;
      if (response.status === 429) {
        isRateLimit = true;
      } else if (response.status === 403) {
        // Only treat 403 as rate limit if it has specific indicators
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          isRateLimit = true;
        } else {
          // Try to check response text for rate limit indicators
          try {
            const text = await response.text();
            if (text.includes('abuse detection') || text.includes('rate limit')) {
              isRateLimit = true;
            }
            return { ok: false, status: response.status, text, isRateLimit };
          } catch {
            // If we can't read the text, assume it's not a rate limit
            isRateLimit = false;
          }
        }
      }
      
      return { ok: false, status: response.status, isRateLimit };
    }
    
    const text = await response.text();
    return { ok: true, status: response.status, text };
    
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, status: 0 };
  }
}

/**
 * Simple async pool runner with concurrency limit
 * Fixed to properly wait for ALL tasks to complete before returning
 */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 2
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  
  // Create all tasks but don't start them yet
  const tasks = items.map(async (item, index) => {
    // Add jitter delay
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));
    results[index] = await processor(item, index);
  });
  
  // Process tasks in batches with concurrency limit
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    await Promise.all(batch);
  }
  
  return results;
}

// ============================================================
// STARTUP & DEBUGGING
// ============================================================

console.log(`[CS] 🟢 Content script loaded at ${window.location.href} - ${new Date().toISOString()}`);

/**
 * Scrape the GitHub Stars page to extract list metadata
 * Returns list of objects with name and URL
 */
function scrapeStarsPage(): Array<{ name: string; url: string }> {
  console.log('[CS] 🔍 Scraping stars page for lists...');
  const lists: Array<{ name: string; url: string }> = [];
  const seen = new Set<string>();

  // Multiple selector strategies for robustness - updated for 2026 GitHub UI
  const selectors = [
    // Modern GitHub UI (2026): Sidebar navigation with turbo-frame
    'turbo-frame[id*="lists"] a[href*="/lists/"]',
    'aside a[href*="/lists/"]',
    '[data-view-component="true"] a[href*="/lists/"]',
    // Sidebar list items
    'nav[aria-label*="Lists"] a[href*="/lists/"]',
    'nav[aria-label*="lists"] a[href*="/lists/"]',
    '[role="navigation"] a[href*="/lists/"]',
    // Primary: Look for "Your lists" section (legacy)
    '[data-filterable-for="your-lists"] a[href*="/stars/lists/"]',
    // Updated: Handle user-specific list URLs
    'a[href*="/stars/"][href*="/lists/"]',
    // Fallback: Direct list links with username pattern
    `a[href*="/stars/${window.location.pathname.split('/')[1]}/lists/"]`,
    // Alternative: Navigation menu items
    'nav a[href*="/lists/"]',
    // Broader: Any link containing "lists" in stars context
    '.js-navigation-item a[href*="/lists/"]',
    // Even broader: look for any links that might be lists
    'a[href*="/lists/"][href*="stars"]',
    // React/modern component selectors
    '[data-testid*="list"] a[href*="/lists/"]',
    '[class*="list"] a[href*="/lists/"]',
    // Generic sidebar patterns
    '.sidebar a[href*="/lists/"]',
    '.Layout-sidebar a[href*="/lists/"]'
  ];

  let foundLinks: NodeListOf<Element> | null = null;
  
  for (const selector of selectors) {
    const links = document.querySelectorAll(selector);
    if (links.length > 0) {
      console.log(`[CS] ✅ Found ${links.length} list links using selector: ${selector}`);
      foundLinks = links;
      break;
    }
  }

  if (!foundLinks || foundLinks.length === 0) {
    console.warn('[CS] ⚠️  No list links found with any selector');
    
    // Debug: Let's see what links are actually on the page
    const allLinks = document.querySelectorAll('a[href]');
    const listRelatedLinks = Array.from(allLinks).filter(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.trim() || '';
      return href.includes('lists') || text.toLowerCase().includes('list');
    });
    
    console.log('[CS] 🔍 Debug - Found', listRelatedLinks.length, 'list-related links:');
    listRelatedLinks.slice(0, 10).forEach((link, i) => {
      console.log(`[CS]   ${i + 1}. "${link.textContent?.trim()}" -> ${link.getAttribute('href')}`);
    });
    
    // Try to detect if user is on the right page
    const isStarsPage = window.location.pathname.includes('/stars') || window.location.search.includes('tab=stars');
    const hasStarsContent = document.querySelector('[data-testid="starred-repos"]') || 
                           document.querySelector('.js-navigation-item[data-selected-links*="stars"]') ||
                           document.querySelector('[data-testid="stars-repo-list"]') ||
                           document.title.toLowerCase().includes('stars');
    
    console.log('[CS] 🔍 Page analysis:', {
      isStarsPage,
      hasStarsContent,
      url: window.location.href,
      title: document.title,
      pathname: window.location.pathname,
      search: window.location.search
    });
    
    return lists;
  }

  // Process found links with validation
  for (const link of Array.from(foundLinks)) {
    const href = link.getAttribute('href');
    let name = link.textContent?.trim() || '';

    if (!href || !name) continue;

    // Normalize name
    name = normalizeListName(name);
    if (name.length === 0) continue;

    // Ensure absolute URL
    const url = href.startsWith('http') ? href : `https://github.com${href}`;
    
    // Validate URL
    if (!isValidListUrl(url)) {
      debugCounters.skippedInvalidListUrls++;
      console.log(`[CS] ⚠️  Skipping invalid list URL: ${url}`);
      continue;
    }
    
    // Avoid duplicates
    if (seen.has(url)) continue;
    seen.add(url);

    lists.push({ name, url });
    console.log(`[CS] ✅ Found list: "${name}" -> ${url}`);
  }

  console.log(`[CS] ✅ Scraped ${lists.length} lists from stars page (skipped ${debugCounters.skippedInvalidListUrls} invalid URLs)`);
  return lists;
}

/**
 * Scrape a single GitHub Stars list page to extract repositories
 */
async function scrapeListPage(listUrl: string): Promise<GitHubRepository[]> {
  const repos: GitHubRepository[] = [];

  try {
    // Validate URL before fetch
    if (!isValidListUrl(listUrl)) {
      console.warn(`[CS] ⚠️  Invalid list URL, skipping: ${listUrl}`);
      return repos;
    }

    console.log(`[CS] 🔍 Fetching list page: ${listUrl}`);
    debugCounters.fetchedListPages++;
    
    // Fetch with timeout and safer credentials
    const result = await fetchHtmlWithTimeout(listUrl, 20000); // Increased timeout to 20s
    
    console.log(`[CS] 📡 Fetch result for ${listUrl}: status=${result.status}, ok=${result.ok}, isRateLimit=${result.isRateLimit || false}`);
    
    if (!result.ok) {
      if (result.isRateLimit) {
        debugCounters.throttledOrRateLimitedCount++;
        debugCounters.actualRateLimitHit = true;
        console.warn(`[CS] ⚠️  Rate limited (${result.status}) for: ${listUrl}`);
      } else {
        console.warn(`[CS] ⚠️  HTTP error (${result.status}) for: ${listUrl}`);
      }
      throw new Error(`Failed to fetch list page: ${result.status}`);
    }

    if (!result.text) {
      throw new Error('No response text received');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(result.text, 'text/html');

    // Multiple selector strategies for repository items
    const repoSelectors = [
      // List pages use h2 tags (not h3!)
      '#user-list-repositories a[href^="/"]',
      'h2 a[href^="/"]',
      'h2.h3 a[href^="/"]',
      // Primary: Modern GitHub structure
      '[data-testid="item-title"]',
      // Fallback: Repository links in list context
      'a[href^="/"][href*="/"][data-hovercard-type="repository"]',
      // Alternative: Box row items with repo links
      '.Box-row a[href^="/"][href*="/"]',
      // Broader: Any repo-like links in h3
      'h3 a[href^="/"], .h4 a[href^="/"]'
    ];

    let repoItems: NodeListOf<Element> | null = null;
    
    for (const selector of repoSelectors) {
      const items = doc.querySelectorAll(selector);
      if (items.length > 0) {
        console.log(`[CS] ✅ Found ${items.length} repo items using selector: ${selector}`);
        repoItems = items;
        break;
      }
    }

    if (!repoItems || repoItems.length === 0) {
      console.warn(`[CS] ⚠️  No repository items found on list page: ${listUrl}`);
      return repos;
    }

    const seen = new Set<string>();

    for (const item of Array.from(repoItems)) {
      const link = item as HTMLAnchorElement;
      const href = link.getAttribute('href') || '';
      
      // Normalize and validate repo href
      const fullName = normalizeRepoHrefToFullName(href);
      if (!fullName) {
        debugCounters.skippedInvalidRepos++;
        continue;
      }
      
      // Avoid duplicates
      if (seen.has(fullName)) continue;
      seen.add(fullName);

      const [owner, repoName] = fullName.split('/');
      const cleanUrl = normalizeRepoUrlFromHref(href, fullName);

      // Create a minimal repo object from scraped data
      const repo: GitHubRepository = {
        id: 0, // Will be fetched/verified separately if needed
        name: repoName,
        full_name: fullName,
        owner: {
          login: owner,
          avatar_url: '', // Could be extracted from image src if needed
        },
        html_url: cleanUrl,
        description: null,
        private: false, // May be private, but we can't know from scraping
        stargazers_count: 0,
        language: null,
      };

      repos.push(repo);
      console.log(`[CS] ✅ Found repo: ${fullName}`);
    }

    console.log(`[CS] ✅ Scraped ${repos.length} repos from list page: ${listUrl} (skipped ${debugCounters.skippedInvalidRepos} invalid)`);
    return repos;

  } catch (error) {
    console.error(`[CS] ❌ Error scraping list page ${listUrl}:`, error);
    throw error;
  }
}

/**
 * Main scraper: fetch all lists and their repos with rate limiting
 */
async function scrapeAllLists(): Promise<GitHubList[]> {
  const lists: GitHubList[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skippedInvalidUrl = 0;
  let stoppedEarly = false;

  try {
    console.log('[CS] 🔍 Starting comprehensive list scraping...');
    
    // First, check if we're on a page that has the lists info
    const listMetadata = scrapeStarsPage();

    if (listMetadata.length === 0) {
      console.warn('[CS] ⚠️  No lists found - user may not be logged into github.com or have no lists');
      return lists;
    }

    console.log(`[CS] 📋 Found ${listMetadata.length} lists to process`);

    // Process lists with concurrency limiting and preserve order
    const results = await runWithConcurrencyLimit(
      listMetadata,
      async ({ name, url }, index) => {
        processed++;
        
        try {
          console.log(`[CS] 📄 Processing list ${index + 1}/${listMetadata.length}: "${name}"`);
          
          // Early stop only if we've hit actual rate limits (not just any 403)
          if (debugCounters.actualRateLimitHit) {
            console.warn(`[CS] ⚠️  Stopping due to actual rate limiting, returning partial results`);
            stoppedEarly = true;
            return null;
          }
          
          // Validate URL before processing
          if (!isValidListUrl(url)) {
            skippedInvalidUrl++;
            console.log(`[CS] ListFetch ${index + 1}/${listMetadata.length} ${name} ${url} -> status=INVALID ok=false`);
            return null;
          }
          
          const repositories = await scrapeListPage(url);
          const listId = createListId(url, name);

          succeeded++;
          console.log(`[CS] ListFetch ${index + 1}/${listMetadata.length} ${name} ${url} -> status=200 ok=true`);
          console.log(`[CS] ✅ Successfully processed "${name}" - ${repositories.length} repos`);
          return {
            id: listId,
            name,
            url,
            repositories,
          };
        } catch (error) {
          failed++;
          console.log(`[CS] ListFetch ${index + 1}/${listMetadata.length} ${name} ${url} -> status=ERROR ok=false`);
          console.error(`[CS] ❌ Failed to scrape list "${name}":`, error);
          return null; // Continue with other lists
        }
      },
      2 // Concurrency limit
    );

    // Filter out failed results and preserve order
    for (const result of results) {
      if (result) {
        lists.push(result);
      }
    }

    // Log completion AFTER all processing is done
    console.log(`[CS] ✅ Scraping complete - ${lists.length} lists with repositories`);
    console.log(`[CS] 📊 Final counters: processed=${processed}, succeeded=${succeeded}, failed=${failed}, skippedInvalidUrl=${skippedInvalidUrl}, stoppedEarly=${stoppedEarly}`);
    console.log(`[CS] 📊 Debug counters:`, debugCounters);

  } catch (error) {
    console.error('[CS] ❌ Error in scrapeAllLists:', error);
  }

  return lists;
}

/**
 * Check if the user is logged into GitHub by looking for login indicators
 */
function isLoggedIntoGitHub(): boolean {
  // Multiple indicators to check for logged-in state
  const indicators = [
    // User profile/avatar in header
    '[data-testid="user-profile-link"]',
    'img[alt*="@"]', // User avatar
    '.Header-link--profile',
    // Signed-in navigation elements
    '[aria-label="View profile and more"]',
    'summary[aria-label*="View profile"]',
    // User menu or dropdown
    '.js-feature-preview-indicator',
    // Any element with user login in data attributes
    '[data-login]'
  ];

  for (const selector of indicators) {
    if (document.querySelector(selector)) {
      console.log(`[CS] ✅ Login detected via selector: ${selector}`);
      return true;
    }
  }

  // Check for absence of login/signup buttons
  const loginButtons = document.querySelectorAll('a[href*="/login"], a[href*="/join"]');
  const isLoggedOut = loginButtons.length > 0;
  
  console.log(`[CS] 🔐 Login status - logged out indicators: ${loginButtons.length}`);
  return !isLoggedOut;
}

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener((message: ContentScriptMessage, sender, sendResponse) => {
  console.log(`[CS] 📨 Message received: "${message.type}" at ${window.location.href} - ${new Date().toISOString()}`);

  // Handle ping message for content script detection
  if ((message as any).type === '__PING__') {
    console.log('[CS] 🏓 Ping received, responding...');
    sendResponse({ ok: true });
    return true;
  }

  (async () => {
    try {
      if (message.type === 'SCRAPE_STARS_PAGE') {
        console.log('[CS] ▶️  Starting stars page scrape...');
        
        // Check if logged in
        const loggedIn = isLoggedIntoGitHub();
        console.log(`[CS] 🔐 Logged in status: ${loggedIn}`);
        
        if (!loggedIn) {
          console.warn('[CS] ⚠️  User not logged into GitHub');
          sendResponse({
            success: false,
            error: 'GITHUB_NOT_LOGGED_IN',
          } as ScrapeResult);
          return;
        }

        console.log('[CS] 📋 Scraping all lists...');
        const lists = await scrapeAllLists();
        console.log(`[CS] ✅ Scraping completed - found ${lists.length} lists`);
        
        // Log detailed results
        lists.forEach((list, idx) => {
          console.log(`[CS]   📁 [${idx + 1}/${lists.length}] "${list.name}" - ${list.repositories.length} repos`);
        });

        sendResponse({
          success: true,
          data: lists,
        } as ScrapeResult);

      } else if (message.type === 'SCRAPE_LIST_PAGE') {
        console.log(`[CS] ▶️  Scraping list page: ${message.url}`);
        const repos = await scrapeListPage(message.url);
        console.log(`[CS] ✅ Found ${repos.length} repos in list`);
        
        sendResponse({
          success: true,
          data: { repositories: repos },
        } as ScrapeResult);
      } else {
        console.warn(`[CS] ❓ Unknown message type: ${(message as any).type}`);
        sendResponse({
          success: false,
          error: 'Unknown message type',
        } as ScrapeResult);
      }
    } catch (error) {
      console.error('[CS] ❌ Error handling message:', error instanceof Error ? error.message : String(error));
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ScrapeResult);
    }
  })();

  return true; // Will respond asynchronously
});

console.log('[CS] ✅ Content script fully loaded and ready');