/**
 * Syncer: Orchestrates fetching and caching of starred repos and lists
 */

import {
  GitHubRepository,
  GitHubList,
  ExtensionSettings,
  STORAGE_KEYS,
} from '../shared/types';
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
      const isUserStarsPage = tab.url?.includes(`/${viewer.login}?tab=stars`) && 
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
        if (tab.url && !tab.url.includes('/login') && !tab.url.includes('/device') && !tab.url.includes('/settings')) {
          targetTab = tab;
          console.log('[Syncer] 🔄 Reusing GitHub tab and navigating to user stars:', tab.id, tab.url);
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
      console.log('[Syncer] ✅ Tab created:', targetTab.id);
    } else if (!targetTab.url?.includes(`/${viewer.login}?tab=stars`)) {
      // Navigate existing tab to user stars page
      console.log('[Syncer] 🧭 Navigating tab to user stars page...');
      await chrome.tabs.update(targetTab.id!, { url: userStarsUrl });
    }

    // Wait for the tab to load completely
    console.log('[Syncer] ⏳ Waiting for tab to load...');
    await waitForTabComplete(targetTab.id!);
    console.log('[Syncer] ✅ Tab loaded successfully');

    // Message the content script to scrape
    return new Promise((resolve) => {
      if (!targetTab || !targetTab.id) {
        console.error('[Syncer] ❌ No valid tab ID');
        resolve({ success: false, error: 'Could not find or create GitHub tab' });
        return;
      }

      console.log(`[Syncer] 📤 Sending SCRAPE_STARS_PAGE message to tab ${targetTab.id} (${targetTab.url})...`);
      const timeout = setTimeout(() => {
        console.error('[Syncer] ❌ Content script timeout after 10s');
        resolve({ success: false, error: 'Timeout waiting for content script response' });
      }, 10000); // Increased timeout

      chrome.tabs.sendMessage(
        targetTab.id,
        { type: 'SCRAPE_STARS_PAGE' } as any,
        (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('[Syncer] ❌ Content script error:', chrome.runtime.lastError.message);
            resolve({
              success: false,
              error: 'Could not communicate with GitHub page. Sign in to GitHub and visit your stars page to sync lists.',
            });
            return;
          }

          if (!response) {
            console.error('[Syncer] ❌ No response from content script');
            resolve({ success: false, error: 'No response from content script' });
            return;
          }

          console.log('[Syncer] 📨 Content script response received:', { success: response.success, listsCount: response.data?.length || 0 });

          if (response?.success) {
            const lists = response.data || [];
            console.log(`[Syncer] ✅ Got ${lists.length} lists from scraper`);
            
            // Log list details
            lists.forEach((list: GitHubList, idx: number) => {
              console.log(`[Syncer]   📁 [${idx + 1}/${lists.length}] "${list.name}" - ${list.repositories.length} repos`);
            });
            
            // Cache results
            chrome.storage.local.set({
              [STORAGE_KEYS.LISTS_CACHE]: lists,
              [STORAGE_KEYS.LAST_SYNC_LISTS]: Date.now(),
            });

            console.log(`[Syncer] 💾 Cached ${lists.length} lists`);
            resolve({ success: true, lists });
          } else {
            const error = response?.error || 'Failed to scrape lists';
            console.error('[Syncer] ❌ Scrape error:', error);
            resolve({ success: false, error });
          }
        }
      );
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error syncing lists:', errorMsg);
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
    console.log('[Sync] 📊 Lists sync result:', { success: listsResult.success, count: listsResult.lists?.length || 0, error: listsResult.error });
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
