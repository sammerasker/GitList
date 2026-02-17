/**
 * Syncer: Orchestrates fetching and caching of starred repos and lists
 */

import { GitHubRepository, GitHubList, ExtensionSettings, STORAGE_KEYS } from '../shared/types';
import { fetchAllStarred, checkAuthStatus } from './githubApi';
import { getToken, getCachedViewer } from './auth';

export interface SyncState {
  allStarred: GitHubRepository[];
  lists: GitHubList[];
  lastSyncAllStarred: number | null;
  lastSyncLists: number | null;
  errors: { allStarred?: string; lists?: string };
}

/**
 * Get current sync state from cache
 */
export async function getSyncState(): Promise<SyncState> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.ALL_STARRED_CACHE,
    STORAGE_KEYS.LISTS_CACHE,
    STORAGE_KEYS.LAST_SYNC_ALL_STARRED,
    STORAGE_KEYS.LAST_SYNC_LISTS,
  ]);

  const allStarredCache = data[STORAGE_KEYS.ALL_STARRED_CACHE];
  const listsCache = data[STORAGE_KEYS.LISTS_CACHE];

  return {
    allStarred: allStarredCache || [],
    lists: listsCache || [],
    lastSyncAllStarred: data[STORAGE_KEYS.LAST_SYNC_ALL_STARRED] || null,
    lastSyncLists: data[STORAGE_KEYS.LAST_SYNC_LISTS] || null,
    errors: {},
  };
}

/**
 * Sync starred repositories from GitHub API
 */
export async function syncAllStarred(settings: ExtensionSettings): Promise<{
  success: boolean;
  repos?: GitHubRepository[];
  error?: string;
}> {
  try {
    const token = await getToken(settings.sessionOnlyToken);
    if (!token) {
      return { success: false, error: 'No authentication token' };
    }

    // Verify token is still valid
    const isValid = await checkAuthStatus(token);
    if (!isValid) {
      return { success: false, error: 'Authentication token is invalid' };
    }

    const repos = await fetchAllStarred(token);

    // Cache results
    await chrome.storage.local.set({
      [STORAGE_KEYS.ALL_STARRED_CACHE]: repos,
      [STORAGE_KEYS.LAST_SYNC_ALL_STARRED]: Date.now(),
    });

    console.log(`[Sync] Successfully synced ${repos.length} starred repos`);
    return { success: true, repos };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error syncing all starred:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Scrape lists from GitHub by messaging content script
 */
export async function syncLists(): Promise<{
  success: boolean;
  lists?: GitHubList[];
  error?: string;
}> {
  let createdTabId: number | null = null; // Track if we created a new tab

  try {
    console.log('[Syncer] 📋 Starting Lists sync...');

    // Get the current user's username to build the correct stars URL
    const viewer = await getCachedViewer();
    if (!viewer || !viewer.login) {
      return { success: false, error: 'No authenticated user found' };
    }

    const userStarsUrl = `https://github.com/${viewer.login}?tab=stars`;
    console.log('[Syncer] 🎯 Target stars URL:', userStarsUrl);

    // Find a GitHub tab or open one
    const tabs = await chrome.tabs.query({ url: 'https://github.com/*' });
    console.log(`[Syncer] 🔍 Found ${tabs.length} GitHub tabs`);

    let targetTab: chrome.tabs.Tab | null = null;

    // Look for a tab on the user's stars page first
    for (const tab of tabs) {
      const isUserStarsPage =
        tab.url?.includes(`/${viewer.login}?tab=stars`) &&
        !tab.url.includes('/login') &&
        !tab.url.includes('/device');
      if (isUserStarsPage) {
        targetTab = tab;
        console.log('[Syncer] ✅ Found existing user stars page tab:', tab.id, tab.url);
        break;
      }
    }

    // If no suitable stars tab found, we need to navigate to stars page
    if (!targetTab) {
      // Try to reuse any GitHub tab (but not login/device pages)
      for (const tab of tabs) {
        if (
          tab.url &&
          !tab.url.includes('/login') &&
          !tab.url.includes('/device') &&
          !tab.url.includes('/settings')
        ) {
          targetTab = tab;
          console.log(
            '[Syncer] 🔄 Reusing GitHub tab and navigating to user stars:',
            tab.id,
            tab.url
          );
          break;
        }
      }
    }

    // If still no suitable tab, create a new one
    if (!targetTab) {
      console.log('[Syncer] 📂 Creating new user stars page tab...');
      targetTab = await chrome.tabs.create({
        url: userStarsUrl,
        active: false,
      });
      createdTabId = targetTab.id!; // Track that we created this tab
      console.log('[Syncer] ✅ Tab created:', targetTab.id, '(will auto-close after sync)');
    } else if (!targetTab.url?.includes(`/${viewer.login}?tab=stars`)) {
      // Navigate existing tab to user stars page
      console.log('[Syncer] 🧭 Navigating tab to user stars page...');
      await chrome.tabs.update(targetTab.id!, { url: userStarsUrl });
    }

    // Wait for the tab to load completely
    console.log('[Syncer] ⏳ Waiting for tab to load...');
    await waitForTabComplete(targetTab.id!);
    console.log('[Syncer] ✅ Tab loaded successfully');

    // Ensure content script is injected and ready
    const scriptReady = await ensureContentScript(targetTab.id!);
    if (!scriptReady) {
      console.error('[Syncer] ❌ Content script not available on GitHub tab');
      
      // Close tab if we created it
      if (createdTabId !== null) {
        console.log('[Syncer] 🗑️  Closing created tab due to error:', createdTabId);
        await chrome.tabs.remove(createdTabId).catch((err) => {
          console.warn('[Syncer] ⚠️  Failed to close tab:', err);
        });
      }
      
      return {
        success: false,
        error:
          'Content script not available on GitHub tab. Please ensure you are on a GitHub page.',
      };
    }

    // Message the content script to scrape
    return new Promise((resolve) => {
      if (!targetTab || !targetTab.id) {
        console.error('[Syncer] ❌ No valid tab ID');
        resolve({ success: false, error: 'Could not find or create GitHub tab' });
        return;
      }

      console.log(
        `[Syncer] 📤 Sending SCRAPE_STARS_PAGE message to tab ${targetTab.id} (${targetTab.url})...`
      );
      const timeout = setTimeout(() => {
        console.error('[Syncer] ❌ Content script timeout after 10s');
        
        // Close tab if we created it
        if (createdTabId !== null) {
          console.log('[Syncer] 🗑️  Closing created tab due to timeout:', createdTabId);
          chrome.tabs.remove(createdTabId).catch((err) => {
            console.warn('[Syncer] ⚠️  Failed to close tab:', err);
          });
        }
        
        resolve({ success: false, error: 'Timeout waiting for content script response' });
      }, 10000); // Increased timeout

      chrome.tabs.sendMessage(targetTab.id, { type: 'SCRAPE_STARS_PAGE' } as any, (response) => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          console.error('[Syncer] ❌ Content script error:', chrome.runtime.lastError.message);
          
          // Close tab if we created it
          if (createdTabId !== null) {
            console.log('[Syncer] 🗑️  Closing created tab due to error:', createdTabId);
            chrome.tabs.remove(createdTabId).catch((err) => {
              console.warn('[Syncer] ⚠️  Failed to close tab:', err);
            });
          }
          
          resolve({
            success: false,
            error:
              'Could not communicate with GitHub page. Sign in to GitHub and visit your stars page to sync lists.',
          });
          return;
        }

        if (!response) {
          console.error('[Syncer] ❌ No response from content script');
          
          // Close tab if we created it
          if (createdTabId !== null) {
            console.log('[Syncer] 🗑️  Closing created tab due to no response:', createdTabId);
            chrome.tabs.remove(createdTabId).catch((err) => {
              console.warn('[Syncer] ⚠️  Failed to close tab:', err);
            });
          }
          
          resolve({ success: false, error: 'No response from content script' });
          return;
        }

        console.log('[Syncer] 📨 Content script response received:', {
          success: response.success,
          listsCount: response.data?.length || 0,
        });

        if (response?.success) {
          const lists = response.data || [];
          console.log(`[Syncer] ✅ Got ${lists.length} lists from scraper`);

          // Log list details
          lists.forEach((list: GitHubList, idx: number) => {
            console.log(
              `[Syncer]   📁 [${idx + 1}/${lists.length}] "${list.name}" - ${list.repositories.length} repos`
            );
          });

          // Check if user has no lists
          if (lists.length === 0) {
            console.log('[Syncer] ℹ️  No lists found - user may not have created any lists yet');
            console.log('[Syncer] 💡 Create lists at: https://github.com/stars');

            // Cache empty result but don't treat as error
            chrome.storage.local.set({
              [STORAGE_KEYS.LISTS_CACHE]: [],
              [STORAGE_KEYS.LAST_SYNC_LISTS]: Date.now(),
            });

            // Close tab if we created it
            if (createdTabId !== null) {
              console.log('[Syncer] 🗑️  Closing created tab (no lists found):', createdTabId);
              chrome.tabs.remove(createdTabId).catch((err) => {
                console.warn('[Syncer] ⚠️  Failed to close tab:', err);
              });
            }

            resolve({
              success: true,
              lists: [],
              error:
                'No lists found. Create lists at github.com/stars to organize your starred repos.',
            });
            return;
          }

          // Cache results
          chrome.storage.local.set({
            [STORAGE_KEYS.LISTS_CACHE]: lists,
            [STORAGE_KEYS.LAST_SYNC_LISTS]: Date.now(),
          });

          console.log(`[Syncer] 💾 Cached ${lists.length} lists`);
          
          // Close tab if we created it (successful sync)
          if (createdTabId !== null) {
            console.log('[Syncer] 🗑️  Closing created tab (sync complete):', createdTabId);
            chrome.tabs.remove(createdTabId).catch((err) => {
              console.warn('[Syncer] ⚠️  Failed to close tab:', err);
            });
          }
          
          resolve({ success: true, lists });
        } else {
          const error = response?.error || 'Failed to scrape lists';
          console.error('[Syncer] ❌ Scrape error:', error);
          
          // Close tab if we created it
          if (createdTabId !== null) {
            console.log('[Syncer] 🗑️  Closing created tab due to scrape error:', createdTabId);
            chrome.tabs.remove(createdTabId).catch((err) => {
              console.warn('[Syncer] ⚠️  Failed to close tab:', err);
            });
          }
          
          resolve({ success: false, error });
        }
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error syncing lists:', errorMsg);
    
    // Close tab if we created it
    if (createdTabId !== null) {
      console.log('[Syncer] 🗑️  Closing created tab due to exception:', createdTabId);
      chrome.tabs.remove(createdTabId).catch((err) => {
        console.warn('[Syncer] ⚠️  Failed to close tab:', err);
      });
    }
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Wait for a tab to reach 'complete' status
 */
async function waitForTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tab load timeout'));
    }, 15000);

    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          clearTimeout(timeout);
          // Additional wait for content script to load
          setTimeout(resolve, 1000);
        } else {
          setTimeout(checkTab, 500);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    };

    checkTab();
  });
}

/**
 * Ensure content script is injected and ready in the target tab
 * Returns true if content script is available, false otherwise
 */
async function ensureContentScript(tabId: number): Promise<boolean> {
  console.log(`[Syncer] 🔍 Checking if content script is available in tab ${tabId}...`);

  // First, try to ping the content script
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: '__PING__' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log(
          `[Syncer] ⚠️  Content script not responding: ${chrome.runtime.lastError.message}`
        );
        console.log(`[Syncer] 💉 Attempting to inject content script...`);

        // Content script not available, try to inject it
        chrome.scripting.executeScript(
          {
            target: { tabId },
            files: ['content/githubScraper.js'],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                `[Syncer] ❌ Failed to inject content script: ${chrome.runtime.lastError.message}`
              );
              resolve(false);
              return;
            }

            console.log(`[Syncer] ✅ Content script injected successfully`);

            // Wait a bit for the script to initialize, then verify with another ping
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { type: '__PING__' }, (verifyResponse) => {
                if (chrome.runtime.lastError || !verifyResponse?.ok) {
                  console.error(`[Syncer] ❌ Content script still not responding after injection`);
                  resolve(false);
                } else {
                  console.log(`[Syncer] ✅ Content script verified and ready`);
                  resolve(true);
                }
              });
            }, 500);
          }
        );
      } else if (response?.ok) {
        console.log(`[Syncer] ✅ Content script already available`);
        resolve(true);
      } else {
        console.error(`[Syncer] ❌ Content script responded but with unexpected response`);
        resolve(false);
      }
    });
  });
}

/**
 * Perform full sync of both starred repos and lists
 */
export async function syncAll(settings: ExtensionSettings): Promise<SyncState> {
  console.log('[Sync] Starting full sync...');

  const state = await getSyncState();

  // Sync all starred
  const starredResult = await syncAllStarred(settings);
  if (starredResult.success && starredResult.repos) {
    state.allStarred = starredResult.repos;
    state.lastSyncAllStarred = Date.now();
  } else {
    state.errors.allStarred = starredResult.error;
  }

  // Sync lists if enabled
  if (settings.listsSyncEnabled) {
    console.log('[Sync] 📋 Lists sync is enabled - starting syncLists...');
    const listsResult = await syncLists();
    console.log('[Sync] 📊 Lists sync result:', {
      success: listsResult.success,
      count: listsResult.lists?.length || 0,
      error: listsResult.error,
    });
    if (listsResult.success && listsResult.lists) {
      state.lists = listsResult.lists;
      state.lastSyncLists = Date.now();
    } else {
      state.errors.lists = listsResult.error;
    }
  } else {
    console.log('[Sync] ⏭️  Lists sync is disabled in settings');
  }

  console.log('[Sync] Full sync complete');
  return state;
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.ALL_STARRED_CACHE,
    STORAGE_KEYS.LISTS_CACHE,
    STORAGE_KEYS.LAST_SYNC_ALL_STARRED,
    STORAGE_KEYS.LAST_SYNC_LISTS,
  ]);
  console.log('[Sync] Caches cleared');
}
