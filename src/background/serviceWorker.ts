/**
 * Service Worker for Chrome Extension (Manifest V3)
 * Manages authentication, syncing, alarms, and message routing
 */

import {
  Message,
  ExtensionSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  StateUpdate,
  SyncProgress,
} from '../shared/types';
import { resolveClientId, getClientIdErrorMessage } from '../shared/config';
import {
  requestDeviceCode,
  pollForToken,
  abortTokenPoll,
  fetchViewerIdentity,
  getToken,
  clearToken,
  storeToken,
  storeViewer,
  getCachedViewer,
  clearViewer,
} from './auth';
import { syncAll, getSyncState, clearCaches } from './syncer';
import { SYNC_ALARM_NAME, DEFAULT_REFRESH_HOURS } from '../shared/constants';

// ============================================================
// STARTUP & DEBUGGING
// ============================================================

console.log('[SW] 🟢 Service Worker loaded at', new Date().toISOString());

// Global error handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// Global error listener
self.addEventListener('error', (event) => {
  console.error('[SW] Unhandled error:', event.message, event.filename, event.lineno);
});

// Track sync progress for UI updates
let isSyncing = false;

// ============================================================
// LIFECYCLE EVENTS
// ============================================================

/**
 * On extension install or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SW] 🔧 onInstalled fired:', details.reason, new Date().toISOString());
  if (details.reason === 'install') {
    console.log('[SW] ✨ Extension freshly installed');
  } else if (details.reason === 'update') {
    console.log('[SW] 🔄 Extension updated');
  }
});

/**
 * On service worker startup (after being suspended)
 */
chrome.runtime.onStartup?.addListener?.(() => {
  console.log('[SW] 🚀 onStartup fired:', new Date().toISOString());
});

// ============================================================
// STORAGE & SETTINGS
// ============================================================
async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  return {
    ...DEFAULT_SETTINGS,
    ...(data[STORAGE_KEYS.SETTINGS] || {}),
  };
}

/**
 * Save settings to storage
 */
async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: settings,
  });
}

/**
 * Build state update for popup
 */
async function buildStateUpdate(): Promise<StateUpdate> {
  const settings = await getSettings();
  const token = await getToken(settings.sessionOnlyToken);
  const viewer = await getCachedViewer();
  const syncState = await getSyncState();

  // Try to detect if user is logged into github.com
  // by checking if any existing github.com tabs exist (imperfect but reasonable)
  const githubTabs = await chrome.tabs.query({ url: 'https://github.com/*' });
  const isLoggedIntoGitHub = githubTabs.length > 0; // Heuristic

  return {
    isConnected: !!token,
    viewer,
    allStarred: syncState.allStarred || [],
    lists: syncState.lists || [],
    isLoggedIntoGitHub,
    lastSyncAllStarred: syncState.lastSyncAllStarred || undefined,
    lastSyncLists: syncState.lastSyncLists || undefined,
    syncInProgress: isSyncing,
    error: Object.values(syncState.errors).find(e => e) || undefined,
  };
}

/**
 * Broadcast state update to all popups
 */
async function broadcastStateUpdate(): Promise<void> {
  const state = await buildStateUpdate();
  chrome.runtime.sendMessage({
    type: 'STATE_UPDATE',
    payload: state,
  }).catch(() => {
    // Popup may not be open, that's OK
  });
}

/**
 * Set up auto-refresh alarm
 */
async function setupAlarm(): Promise<void> {
  const settings = await getSettings();
  
  if (!settings.autoRefreshEnabled) {
    console.log('[SW] 🔕 Auto-refresh disabled - clearing alarm');
    await chrome.alarms.clear(SYNC_ALARM_NAME);
    return;
  }

  const periodInMinutes = settings.autoRefreshIntervalHours * 60;
  
  console.log(`[SW] 🔔 Creating alarm with periodInMinutes: ${periodInMinutes} (${settings.autoRefreshIntervalHours} hours)`);
  
  await chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes,
  });

  // Verify the alarm was created correctly
  const alarm = await chrome.alarms.get(SYNC_ALARM_NAME);
  if (alarm) {
    console.log(`[SW] ✅ Alarm verified - periodInMinutes: ${alarm.periodInMinutes}, scheduledTime: ${new Date(alarm.scheduledTime).toISOString()}`);
  } else {
    console.error('[SW] ❌ Alarm creation failed - alarm not found after creation');
  }
}

/**
 * Handle device flow connection
 */
async function handleConnect(): Promise<void> {
  try {
    // Get settings to check for custom client ID
    const settings = await getSettings();
    
    // Resolve client ID with proper precedence
    const clientId = await resolveClientId();
    
    if (!clientId) {
      throw new Error(getClientIdErrorMessage());
    }

    // Request device code with scope based on settings
    const deviceCodeResponse = await requestDeviceCode(clientId, settings.includePrivateRepos);

    // Notify popup with device code and verification URI
    // Popup will handle showing this to the user
    chrome.runtime.sendMessage({
      type: 'DEVICE_CODE_RECEIVED',
      payload: deviceCodeResponse,
    }).catch(() => {
      // Popup may not be open
    });

    // Start polling for token
    try {
      const token = await pollForToken(
        clientId,
        deviceCodeResponse.device_code,
        deviceCodeResponse.interval
      );

      // Store token with session preference
      await storeToken(token, settings.sessionOnlyToken);

      // Fetch and cache viewer identity
      const viewer = await fetchViewerIdentity(token);
      await storeViewer(viewer);

      // Notify popup
      chrome.runtime.sendMessage({
        type: 'CONNECTION_SUCCESS',
        payload: viewer,
      }).catch(() => {});

      // Trigger initial sync
      await performSync(settings);

      // Set up alarm for auto-refresh
      await setupAlarm();

    } catch (error) {
      console.error('[SW] Token polling error:', error);
      chrome.runtime.sendMessage({
        type: 'CONNECTION_ERROR',
        payload: error instanceof Error ? error.message : 'Connection failed',
      }).catch(() => {});
    }

  } catch (error) {
    console.error('[SW] Connect error:', error);
    chrome.runtime.sendMessage({
      type: 'CONNECTION_ERROR',
      payload: error instanceof Error ? error.message : 'Connection failed',
    }).catch(() => {});
  }
}

/**
 * Handle disconnect
 */
async function handleDisconnect(): Promise<void> {
  try {
    abortTokenPoll();
    await clearToken();
    await clearViewer();
    await clearCaches();
    await chrome.alarms.clear(SYNC_ALARM_NAME);

    chrome.runtime.sendMessage({
      type: 'DISCONNECTION_SUCCESS',
    }).catch(() => {});

    await broadcastStateUpdate();
  } catch (error) {
    console.error('[SW] Disconnect error:', error);
  }
}

/**
 * Perform full sync
 */
async function performSync(settings: ExtensionSettings): Promise<void> {
  try {
    if (isSyncing) {
      console.log('[SW] ⏭️  Sync already in progress, skipping');
      return;
    }

    console.log('[SW] 🔄 Starting full sync...');
    isSyncing = true;
    await broadcastStateUpdate();

    const settings = await getSettings();
    const token = await getToken(settings.sessionOnlyToken);
    if (!token) {
      throw new Error('Not authenticated - cannot sync');
    }
    console.log('[SW] ✅ Token verified');

    // Execute sync
    console.log('[SW] 📡 Calling syncAll...');
    const syncState = await syncAll(settings);
    console.log('[SW] ✅ syncAll completed:', { stars: syncState.allStarred.length, lists: syncState.lists.length });

    // Update cache
    await chrome.storage.local.set({
      [STORAGE_KEYS.ALL_STARRED_CACHE]: syncState.allStarred,
      [STORAGE_KEYS.LISTS_CACHE]: syncState.lists,
      [STORAGE_KEYS.LAST_SYNC_ALL_STARRED]: Date.now(),
      [STORAGE_KEYS.LAST_SYNC_LISTS]: Date.now(),
    });
    console.log('[SW] 💾 Cache updated');

    isSyncing = false;
    await broadcastStateUpdate();
    console.log('[SW] ✅ Sync completed successfully');

  } catch (error) {
    console.error('[SW] ❌ Sync error:', error instanceof Error ? error.message : String(error));
    isSyncing = false;
    await broadcastStateUpdate();
  }
}

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log(`[SW] 📨 Message received: "${message.type}" from ${sender.id === chrome.runtime.id ? 'popup' : 'content'} at ${new Date().toISOString()}`);
  if (message.payload) {
    console.log('[SW] 📦 Payload preview:', JSON.stringify(message.payload).substring(0, 100) + '...');
  }

  (async () => {
    try {
      switch (message.type) {
        case 'CONNECT_START':
          console.log('[SW] ▶️  Starting connect flow...');
          await handleConnect();
          console.log('[SW] ✅ Connect flow completed');
          break;

        case 'CONNECT_ABORT':
          console.log('[SW] ⏹️  Aborting token poll...');
          abortTokenPoll();
          console.log('[SW] ✅ Token poll aborted');
          break;

        case 'DISCONNECT':
          console.log('[SW] 🔌 Disconnecting...');
          await handleDisconnect();
          console.log('[SW] ✅ Disconnected');
          break;

        case 'REFRESH_NOW':
          console.log('[SW] 🔄 REFRESH_NOW received - starting manual refresh...');
          const settings = await getSettings();
          console.log('[SW] ⚙️  Settings loaded - listsSyncEnabled:', settings.listsSyncEnabled);
          await performSync(settings);
          console.log('[SW] ✅ Manual refresh completed');
          break;

        case 'GET_STATE':
          console.log('[SW] 📊 Building state...');
          const state = await buildStateUpdate();
          console.log('[SW] ✅ State built - connected:', state.isConnected, 'stars:', state.allStarred?.length || 0, 'lists:', state.lists?.length || 0);
          sendResponse(state);
          break;

        case 'GET_SETTINGS':
          console.log('[SW] ⚙️  Getting settings...');
          const currentSettings = await getSettings();
          console.log('[SW] ✅ Settings retrieved');
          sendResponse(currentSettings);
          break;

        case 'UPDATE_SETTINGS': {
          console.log('[SW] ⚙️  Updating settings:', message.payload);
          const updatedSettings = {
            ...await getSettings(),
            ...message.payload,
          };
          await saveSettings(updatedSettings);
          
          // Reconfigure alarm if needed
          if ('autoRefreshEnabled' in message.payload || 'autoRefreshIntervalHours' in message.payload) {
            console.log('[SW] 🔔 Reconfiguring alarm...');
            await setupAlarm();
          }

          console.log('[SW] ✅ Settings updated');
          sendResponse(updatedSettings);
          break;
        }

        case 'SET_CLIENT_ID':
          // Legacy message - migrate to UPDATE_SETTINGS with customClientId
          console.log('[SW] 🔑 Setting legacy client ID');
          const legacySettings = await getSettings();
          legacySettings.customClientId = message.payload;
          await saveSettings(legacySettings);
          sendResponse({ success: true });
          break;

        default:
          console.warn('[SW] ❓ Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[SW] ❌ Error handling message:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  })();

  return true; // Will respond asynchronously
});

/**
 * Alarm handler
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    console.log('[SW] ⏰ Auto-refresh alarm triggered at', new Date().toISOString());
    console.log(`[SW] 📊 Alarm details - periodInMinutes: ${alarm.periodInMinutes}, scheduledTime: ${new Date(alarm.scheduledTime).toISOString()}`);
    const settings = await getSettings();
    console.log(`[SW] ⚙️  Current settings - autoRefreshIntervalHours: ${settings.autoRefreshIntervalHours}`);
    await performSync(settings);
  }
});

/**
 * On extension install/update
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[SW] 🔧 Extension installed/updated - initializing...');
  
  // Initialize settings if not present
  const data = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  if (!data[STORAGE_KEYS.SETTINGS]) {
    console.log('[SW] 📝 Initializing default settings');
    await saveSettings(DEFAULT_SETTINGS);
  }

  // Re-establish alarm in case service worker was restarted
  const settings = await getSettings();
  if (settings.autoRefreshEnabled) {
    console.log('[SW] 🔔 Re-establishing auto-refresh alarm');
    await setupAlarm();
  }
});

console.log('[SW] ✅ Service worker fully loaded and ready');
