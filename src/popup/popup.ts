/**
 * Popup UI logic - Main entry point for popup.html
 */

console.log('[Popup] loaded');

import type { Message } from '../shared/types';
import {
  StateUpdate,
  ExtensionSettings,
  DEFAULT_SETTINGS,
  GitHubRepository,
  GitHubList,
  ContentScriptMessage,
  ScrapeResult,
} from '../shared/types';
import { formatLastSyncTime, parseRepoName, buildRepoUrl, debounce } from '../shared/utils';

// ============================================================
// DARK MODE
// ============================================================

/**
 * Apply dark mode based on setting
 */
function applyDarkMode(mode: 'auto' | 'light' | 'dark'): void {
  const body = document.body;
  
  // Remove existing classes
  body.classList.remove('light-mode', 'dark-mode');
  
  if (mode === 'light') {
    body.classList.add('light-mode');
  } else if (mode === 'dark') {
    body.classList.add('dark-mode');
  }
  // If 'auto', let CSS media query handle it (no class needed)
}

// ============================================================
// GLOBAL ERROR HANDLING
// ============================================================

let lastErrorTime = 0;
const errorDebounceMs = 2000;

/**
 * Safe message sending helper with error handling
 */
async function safeSendMessage<T>(message: Message): Promise<T | null> {
  try {
    const response = await chrome.runtime.sendMessage(message);

    // Check for chrome.runtime.lastError
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }

    return response as T;
  } catch (error) {
    console.error(`[Popup] ❌ Message failed: "${message.type}":`, error);

    // User-friendly error messages
    if (error instanceof Error) {
      if (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('message port closed') ||
        error.message.includes('Receiving end does not exist')
      ) {
        showError('Extension background is not responding. Reload the extension.');
      } else {
        showError('Something went wrong. Try refreshing the page.');
      }
    } else {
      showError('Extension background is not responding. Reload the extension.');
    }

    return null;
  }
}

/**
 * Show error in banner with debouncing
 */
function showError(message: string, details?: unknown): void {
  const now = Date.now();

  // Debounce repeated errors
  if (now - lastErrorTime < errorDebounceMs) {
    return;
  }
  lastErrorTime = now;

  // Don't reveal sensitive information
  let safeMessage = message;
  if (typeof message === 'string') {
    // Remove potential OAuth codes or tokens from error messages
    safeMessage = message.replace(/[a-f0-9]{20,}/gi, '[REDACTED]');
    safeMessage = safeMessage.replace(/gho_[a-zA-Z0-9_]+/gi, '[REDACTED]');
  }

  // Log details for debugging (but not sensitive info)
  if (details && typeof details === 'object') {
    console.error('[Popup] Error details:', details);
  }

  // Show in error banner
  const errorBanner = document.getElementById('error-banner');
  const errorBannerMessage = document.getElementById('error-banner-message');

  if (errorBanner && errorBannerMessage) {
    errorBannerMessage.textContent = safeMessage;
    errorBanner.classList.remove('hidden');
  }

  // Fallback to existing notification system
  const errorNotification = document.getElementById('error-notification');
  const errorMessage = document.getElementById('error-message');
  if (errorNotification && errorMessage) {
    errorMessage.textContent = safeMessage;
    errorNotification.classList.remove('hidden');

    setTimeout(() => {
      errorNotification.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Clear error banner
 */
function clearError(): void {
  const errorBanner = document.getElementById('error-banner');
  if (errorBanner) {
    errorBanner.classList.add('hidden');
  }
}

/**
 * Reset UI to sane state (re-enable buttons, stop spinners)
 */
function resetUIState(): void {
  // Re-enable all buttons
  document.querySelectorAll('button').forEach((btn) => {
    if (btn.id !== 'error-banner-close') {
      btn.disabled = false;
    }
  });

  // Reset button text for test buttons
  const testRefreshBtn = document.getElementById('test-refresh-btn') as HTMLButtonElement;
  const testListsBtn = document.getElementById('test-lists-btn') as HTMLButtonElement;

  if (testRefreshBtn && testRefreshBtn.textContent !== 'Test Refresh Now') {
    testRefreshBtn.textContent = 'Test Refresh Now';
  }

  if (testListsBtn && testListsBtn.textContent !== 'Test Lists Scraping') {
    testListsBtn.textContent = 'Test Lists Scraping';
  }
}

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Popup] Unhandled promise rejection:', event.reason);
  showError('Something went wrong. Try refreshing the page.', event.reason);
  resetUIState();
  event.preventDefault(); // Prevent default browser error handling
});

window.addEventListener('error', (event) => {
  console.error('[Popup] Unhandled error:', event.error || event.message);
  showError('Something went wrong. Try refreshing the page.', event.error);
  resetUIState();
});

// ============================================================
// UI ELEMENTS
// ============================================================

// UI Elements
const app = document.getElementById('app')!;
const notConnectedView = document.getElementById('not-connected-view')!;
const deviceFlowView = document.getElementById('device-flow-view')!;
const connectedView = document.getElementById('connected-view')!;
const connectBtn = document.getElementById('connect-btn')!;
const disconnectBtn = document.getElementById('disconnect-btn')!;
const refreshBtn = document.getElementById('refresh-btn')!;
const settingsBtn = document.getElementById('settings-btn')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const treeContainer = document.getElementById('tree-container')!;
const syncInfo = document.getElementById('sync-info')!;
const errorNotification = document.getElementById('error-notification')!;
const errorMessage = document.getElementById('error-message')!;

// Settings Modal
const settingsModal = document.getElementById('settings-modal')!;
const closeSettingsBtn = document.getElementById('close-settings-btn')!;
const saveSettingsBtn = document.getElementById('save-settings-btn')!;
const autoRefreshToggle = document.getElementById('auto-refresh-toggle') as HTMLInputElement;
const refreshIntervalInput = document.getElementById('refresh-interval-input') as HTMLInputElement;
const listsSyncToggle = document.getElementById('lists-sync-toggle') as HTMLInputElement;
const darkModeSelect = document.getElementById('dark-mode-select') as HTMLSelectElement;
const privateReposToggle = document.getElementById('private-repos-toggle') as HTMLInputElement;
const sessionTokenToggle = document.getElementById('session-token-toggle') as HTMLInputElement;
const customClientIdInput = document.getElementById('custom-client-id-input') as HTMLInputElement;
const customClientIdSetting = document.getElementById('custom-client-id-setting')!;
const resetClientIdBtn = document.getElementById('reset-client-id-btn')!;
const advancedToggle = document.getElementById('advanced-toggle')!;
const advancedContent = document.getElementById('advanced-content')!;
const testRefreshBtn = document.getElementById('test-refresh-btn') as HTMLButtonElement;
const testListsBtn = document.getElementById('test-lists-btn') as HTMLButtonElement;

// Developer Mode Elements
const diagnosticsSection = document.getElementById('diagnostics-section')!;
const disableDevModeBtn = document.getElementById('disable-dev-mode-btn')!;
const versionLabel = document.getElementById('version-label')!;

// Device Flow
const openGithubBtn = document.getElementById('open-github-btn')!;
const copyCodeBtn = document.getElementById('copy-code-btn')!;
const cancelAuthBtn = document.getElementById('cancel-auth-btn')!;
const userCodeDisplay = document.getElementById('user-code')!;
const deviceFlowStatus = document.getElementById('device-flow-status')!;

// State
let currentState: StateUpdate | null = null;
let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;
const allRepos: Map<string, GitHubRepository> = new Map();
const allLists: Map<string, GitHubList> = new Map();

// Folder expansion state
const folderStates: Map<string, boolean> = new Map([
  ['All Starred', false], // Collapsed by default
  ['Lists', true], // Expanded by default
]);

// Developer Mode state
let devModeEnabled = false;
let versionClickCount = 0;
let versionClickTimer: number | null = null;

/**
 * Send message to service worker (legacy wrapper)
 */
async function sendToSW(message: Message): Promise<unknown> {
  console.log(`[Popup] 📤 Sending message to SW: "${message.type}" at ${new Date().toISOString()}`);
  const response = await safeSendMessage(message);
  console.log(`[Popup] ✅ SW response for "${message.type}":`, response ? 'received' : 'empty');
  return response;
}

/**
 * Request state update from service worker
 */
async function getState(): Promise<StateUpdate | null> {
  try {
    console.log('[Popup] 📤 Sending GET_STATE to SW');
    const state = await safeSendMessage<StateUpdate>({ type: 'GET_STATE' });
    console.log('[Popup] ✅ GET_STATE response received');
    return state;
  } catch (error) {
    console.error('[Popup] ❌ Error getting state:', error);
    return null;
  }
}

/**
 * Update current state and refresh UI
 */
async function updateState(): Promise<void> {
  try {
    const state = await getState();
    if (!state) return;

    currentState = state;

    // Update UI based on connection state
    if (!state.isConnected) {
      showView('not-connected');
    } else {
      showView('connected');
      renderTree();
      updateSyncInfo();
    }

    // Clear any previous errors on successful state update
    clearError();
  } catch (error) {
    console.error('[Popup] ❌ Error updating state:', error);
    showError('Failed to update interface. Try refreshing.', error);
  }
}

/**
 * Show specific view
 */
function showView(viewName: 'not-connected' | 'device-flow' | 'connected'): void {
  notConnectedView.classList.toggle('hidden', viewName !== 'not-connected');
  deviceFlowView.classList.toggle('hidden', viewName !== 'device-flow');
  connectedView.classList.toggle('hidden', viewName !== 'connected');
}

/**
 * Render tree structure
 */
function renderTree(): void {
  if (!currentState) return;

  treeContainer.innerHTML = '';
  allRepos.clear();
  allLists.clear();

  // All Starred folder
  const allStarredExpanded = folderStates.get('All Starred') ?? false;
  const allStarredFolder = createTreeFolder(
    'All Starred',
    currentState.allStarred.length,
    allStarredExpanded
  );

  // Build repo map
  for (const repo of currentState.allStarred) {
    allRepos.set(repo.full_name, repo);
  }

  // Create repo items
  const allStarredItems = document.createElement('div');
  allStarredItems.className = 'tree-folder-items' + (allStarredExpanded ? ' expanded' : '');

  for (const repo of currentState.allStarred) {
    const item = createRepoItem(repo);
    allStarredItems.appendChild(item);
  }

  allStarredFolder.appendChild(allStarredItems);
  treeContainer.appendChild(allStarredFolder);

  // Lists folder
  if (currentState.lists && currentState.lists.length > 0) {
    const listsExpanded = folderStates.get('Lists') ?? true;
    const listsFolder = createTreeFolder('Lists', currentState.lists.length, listsExpanded);
    const listsItems = document.createElement('div');
    listsItems.className = 'tree-folder-items' + (listsExpanded ? ' expanded' : '');

    for (const list of currentState.lists) {
      allLists.set(list.id, list);

      const listItemFolder = createTreeFolder(list.name, list.repositories.length, false);
      const listRepoItems = document.createElement('div');
      listRepoItems.className = 'tree-folder-items';

      for (const repo of list.repositories) {
        const item = createRepoItem(repo, list.id);
        listRepoItems.appendChild(item);
      }

      listItemFolder.appendChild(listRepoItems);
      listsItems.appendChild(listItemFolder);
    }

    listsFolder.appendChild(listsItems);
    treeContainer.appendChild(listsFolder);
  } else if (currentState.listsSyncEnabled) {
    // Show prompt if lists sync is enabled but no lists found
    if (!currentState.isLoggedIntoGitHub) {
      const placeholder = createPlaceholder(
        '📝',
        'Sign into GitHub',
        'Open github.com in this browser to sync your star lists.'
      );
      treeContainer.appendChild(placeholder);
    }
  }

  applySearch();
}

/**
 * Create tree folder element
 */
function createTreeFolder(name: string, count: number, defaultExpanded: boolean): HTMLElement {
  const folder = document.createElement('div');
  folder.className = 'tree-folder';

  const header = document.createElement('div');
  header.className = 'tree-folder-header';

  const toggle = document.createElement('span');
  toggle.className = 'tree-folder-toggle' + (defaultExpanded ? ' expanded' : '');
  toggle.textContent = '▶';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'tree-folder-name';
  nameSpan.textContent = name;

  const countSpan = document.createElement('span');
  countSpan.className = 'tree-folder-count';
  countSpan.textContent = `${count}`;

  header.appendChild(toggle);
  header.appendChild(nameSpan);
  header.appendChild(countSpan);

  header.addEventListener('click', () => {
    const items = folder.querySelector('.tree-folder-items');
    if (items) {
      const isExpanded = items.classList.contains('expanded');
      items.classList.toggle('expanded');
      toggle.classList.toggle('expanded');

      // Save folder state for main folders
      if (name === 'All Starred' || name === 'Lists') {
        folderStates.set(name, !isExpanded);
      }
    }
  });

  folder.appendChild(header);
  return folder;
}

/**
 * Create repository item element
 */
function createRepoItem(repo: GitHubRepository, listId?: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'tree-item';
  item.dataset.repoName = repo.full_name;

  const icon = document.createElement('span');
  icon.className = 'tree-item-icon';
  icon.textContent = '📦';

  const content = document.createElement('div');
  content.className = 'tree-item-content';

  const name = document.createElement('div');
  name.className = 'tree-item-name';
  name.textContent = repo.full_name;

  const meta = document.createElement('div');
  meta.className = 'tree-item-meta';
  const parts: string[] = [];
  if (repo.language) parts.push(repo.language);
  if (repo.stargazers_count) parts.push(`⭐ ${repo.stargazers_count}`);
  meta.textContent = parts.join(' • ') || 'No description';

  content.appendChild(name);
  if (repo.language || repo.stargazers_count) {
    content.appendChild(meta);
  }

  const external = document.createElement('span');
  external.className = 'tree-item-external';
  external.textContent = '↗';

  item.appendChild(icon);
  item.appendChild(content);
  item.appendChild(external);

  item.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: repo.html_url });
  });

  return item;
}

/**
 * Create placeholder element
 */
function createPlaceholder(icon: string, title: string, message: string): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: var(--color-text-secondary);
  `;

  const iconEl = document.createElement('div');
  iconEl.textContent = icon;
  iconEl.style.fontSize = '32px';
  iconEl.style.marginBottom = '12px';

  const titleEl = document.createElement('div');
  titleEl.style.fontWeight = '500';
  titleEl.style.marginBottom = '8px';
  titleEl.textContent = title;

  const messageEl = document.createElement('div');
  messageEl.style.fontSize = 'var(--font-size-sm)';
  messageEl.textContent = message;

  placeholder.appendChild(iconEl);
  placeholder.appendChild(titleEl);
  placeholder.appendChild(messageEl);

  return placeholder;
}

/**
 * Update sync info footer
 */
function updateSyncInfo(): void {
  if (!currentState) return;

  const parts: string[] = [];

  if (currentState.syncInProgress) {
    parts.push('⟳ Syncing...');
  } else {
    if (currentState.lastSyncAllStarred) {
      parts.push(`Stars: ${formatLastSyncTime(currentState.lastSyncAllStarred)}`);
    }
    if (currentState.lastSyncLists && currentSettings.listsSyncEnabled) {
      parts.push(`Lists: ${formatLastSyncTime(currentState.lastSyncLists)}`);
    }
  }

  syncInfo.textContent = parts.join(' • ') || 'Never synced';
}

/**
 * Search/filter functionality
 */
const debouncedSearch = debounce(applySearch, 200);

function applySearch(): void {
  const query = searchInput.value.toLowerCase();

  if (!query) {
    // Show all items
    treeContainer.querySelectorAll('.tree-item').forEach((item) => {
      item.classList.remove('highlight');
      (item as HTMLElement).style.display = '';
    });
    return;
  }

  // Filter items
  treeContainer.querySelectorAll('.tree-item').forEach((item) => {
    const text = (item as HTMLElement).dataset.repoName?.toLowerCase() || '';
    const match = text.includes(query);
    item.classList.toggle('highlight', match);
    (item as HTMLElement).style.display = match ? '' : 'none';
  });
}

/**
 * Handle device flow callback
 */
function handleDeviceCodeReceived(deviceCode: {
  user_code: string;
  verification_uri: string;
}): void {
  showView('device-flow');
  userCodeDisplay.textContent = deviceCode.user_code;
  deviceFlowStatus.textContent = 'Waiting for authorization...';

  openGithubBtn.onclick = () => {
    chrome.tabs.create({ url: deviceCode.verification_uri });
  };

  copyCodeBtn.onclick = () => {
    navigator.clipboard.writeText(deviceCode.user_code);
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyCodeBtn.textContent = 'Copy';
    }, 2000);
  };
}

/**
 * Load and display settings
 */
async function loadSettings(): Promise<void> {
  try {
    const settings = await safeSendMessage<ExtensionSettings>({ type: 'GET_SETTINGS' });
    if (!settings) return;

    currentSettings = settings;
    autoRefreshToggle.checked = settings.autoRefreshEnabled;
    refreshIntervalInput.value = String(settings.autoRefreshIntervalHours);
    listsSyncToggle.checked = settings.listsSyncEnabled;
    darkModeSelect.value = settings.darkMode || 'auto';
    privateReposToggle.checked = settings.includePrivateRepos;
    sessionTokenToggle.checked = settings.sessionOnlyToken;

    // Apply dark mode
    applyDarkMode(settings.darkMode || 'auto');

    // Load developer override (only in dev mode)
    if (devModeEnabled) {
      const data = await chrome.storage.local.get(['githubClientIdOverride']);
      customClientIdInput.value = data.githubClientIdOverride || '';
    } else {
      customClientIdInput.value = '';
    }

    // Load developer mode setting
    await loadDevModeState();
  } catch (error) {
    console.error('[Popup] ❌ Error loading settings:', error);
    showError('Failed to load settings. Try refreshing.', error);
  }
}

/**
 * Load developer mode state from storage
 */
async function loadDevModeState(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['devModeEnabled']);
    devModeEnabled = data.devModeEnabled || false;
    updateDiagnosticsVisibility();
  } catch (error) {
    console.error('[Popup] ❌ Error loading dev mode state:', error);
    devModeEnabled = false;
    updateDiagnosticsVisibility();
  }
}

/**
 * Save developer mode state to storage
 */
async function saveDevModeState(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ devModeEnabled: enabled });
    devModeEnabled = enabled;
    updateDiagnosticsVisibility();
  } catch (error) {
    console.error('[Popup] ❌ Error saving dev mode state:', error);
  }
}

/**
 * Update diagnostics section visibility based on dev mode
 */
function updateDiagnosticsVisibility(): void {
  if (devModeEnabled) {
    diagnosticsSection.classList.remove('hidden');
    customClientIdSetting.classList.remove('hidden');
  } else {
    diagnosticsSection.classList.add('hidden');
    customClientIdSetting.classList.add('hidden');
  }
}

/**
 * Handle version label clicks for dev mode unlock
 */
function handleVersionClick(): void {
  versionClickCount++;

  // Reset timer if this is the first click or extend existing timer
  if (versionClickTimer) {
    clearTimeout(versionClickTimer);
  }

  versionClickTimer = window.setTimeout(() => {
    versionClickCount = 0;
    versionClickTimer = null;
  }, 5000); // 5 second window

  // Check if we've reached 7 clicks
  if (versionClickCount >= 7) {
    versionClickCount = 0;
    if (versionClickTimer) {
      clearTimeout(versionClickTimer);
      versionClickTimer = null;
    }

    // Unlock developer mode
    saveDevModeState(true);
    showError('Developer Mode enabled! Diagnostics are now available.');
  }
}

/**
 * Message listener for background updates
 */
chrome.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as Record<string, unknown> | undefined;
  if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

  console.log('[Popup] 📨 Received message from SW:', msg.type, new Date().toISOString());

  switch (msg.type) {
    case 'STATE_UPDATE':
      console.log('[Popup] 🔄 Processing state update...');
      currentState = msg.payload as StateUpdate;
      updateState();
      break;

    case 'DEVICE_CODE_RECEIVED':
      console.log('[Popup] 🔑 Processing device code...');
      handleDeviceCodeReceived(msg.payload as { user_code: string; verification_uri: string });
      break;

    case 'CONNECTION_SUCCESS':
      console.log('[Popup] ✅ Connection successful');
      showError('Successfully connected to GitHub!');
      updateState();
      break;

    case 'CONNECTION_ERROR':
      console.log('[Popup] ❌ Connection error:', msg.payload);
      showError(typeof msg.payload === 'string' ? msg.payload : 'Connection failed');
      updateState();
      break;

    case 'DISCONNECTION_SUCCESS':
      console.log('[Popup] 🔌 Disconnection successful');
      updateState();
      break;

    default:
      console.log('[Popup] ❓ Unknown message type:', msg.type);
  }
});

/**
 * Event listeners with error handling
 */

// Connection
connectBtn.addEventListener('click', async () => {
  try {
    console.log('[Popup] 🔗 Connect button clicked');
    (connectBtn as HTMLButtonElement).disabled = true;
    await safeSendMessage({ type: 'CONNECT_START' });
  } catch (error) {
    console.error('[Popup] ❌ Connect error:', error);
    showError('Failed to start connection. Try again.', error);
  } finally {
    resetUIState();
  }
});

disconnectBtn.addEventListener('click', async () => {
  try {
    console.log('[Popup] 🔌 Disconnect button clicked');
    if (confirm('Are you sure you want to disconnect?')) {
      (disconnectBtn as HTMLButtonElement).disabled = true;
      await safeSendMessage({ type: 'DISCONNECT' });
    }
  } catch (error) {
    console.error('[Popup] ❌ Disconnect error:', error);
    showError('Failed to disconnect. Try again.', error);
  } finally {
    resetUIState();
  }
});

// Refresh
refreshBtn.addEventListener('click', async () => {
  try {
    console.log('[Popup] 🔄 REFRESH_NOW button clicked');
    if (currentState?.syncInProgress) {
      console.log('[Popup] ⏭️  Sync already in progress, ignoring');
      return;
    }

    (refreshBtn as HTMLButtonElement).disabled = true;
    console.log('[Popup] 📤 Sending REFRESH_NOW to SW');
    await safeSendMessage({ type: 'REFRESH_NOW' });
    await updateState();
  } catch (error) {
    console.error('[Popup] ❌ Refresh error:', error);
    showError('Failed to refresh. Try again.', error);
  } finally {
    resetUIState();
  }
});

// Search
searchInput.addEventListener('input', () => {
  try {
    debouncedSearch();
  } catch (error) {
    console.error('[Popup] ❌ Search error:', error);
    showError('Search failed. Try typing again.', error);
  }
});

// Settings Modal
settingsBtn.addEventListener('click', () => {
  try {
    settingsModal.classList.remove('hidden');
    loadSettings().catch((error) => {
      console.error('[Popup] ❌ Settings load error:', error);
      showError('Failed to load settings.', error);
    });
  } catch (error) {
    console.error('[Popup] ❌ Settings open error:', error);
    showError('Failed to open settings.', error);
  }
});

closeSettingsBtn.addEventListener('click', () => {
  try {
    settingsModal.classList.add('hidden');
  } catch (error) {
    console.error('[Popup] ❌ Settings close error:', error);
  }
});

settingsModal.querySelector('.modal-overlay')?.addEventListener('click', () => {
  try {
    settingsModal.classList.add('hidden');
  } catch (error) {
    console.error('[Popup] ❌ Settings overlay error:', error);
  }
});

saveSettingsBtn.addEventListener('click', async () => {
  try {
    (saveSettingsBtn as HTMLButtonElement).disabled = true;

    const settings: ExtensionSettings = {
      autoRefreshEnabled: autoRefreshToggle.checked,
      autoRefreshIntervalHours: Math.max(
        1,
        Math.min(168, parseInt(refreshIntervalInput.value) || 6)
      ),
      listsSyncEnabled: listsSyncToggle.checked,
      darkMode: darkModeSelect.value as 'auto' | 'light' | 'dark',
      includePrivateRepos: privateReposToggle.checked,
      sessionOnlyToken: sessionTokenToggle.checked,
      customClientId: null, // No longer used - kept for compatibility
    };

    await safeSendMessage({ type: 'UPDATE_SETTINGS', payload: settings });

    // Apply dark mode immediately
    applyDarkMode(settings.darkMode);

    // Save developer override separately (only in dev mode)
    if (devModeEnabled) {
      const overrideValue = customClientIdInput.value.trim() || null;
      await chrome.storage.local.set({ githubClientIdOverride: overrideValue });
    }

    currentSettings = settings;
    settingsModal.classList.add('hidden');
    showError('Settings saved!');
  } catch (error) {
    console.error('[Popup] ❌ Save settings error:', error);
    showError('Failed to save settings. Try again.', error);
  } finally {
    resetUIState();
  }
});

// Cancel auth
cancelAuthBtn.addEventListener('click', async () => {
  try {
    (cancelAuthBtn as HTMLButtonElement).disabled = true;
    await safeSendMessage({ type: 'CONNECT_ABORT' });
    await updateState();
  } catch (error) {
    console.error('[Popup] ❌ Cancel auth error:', error);
    showError('Failed to cancel authorization.', error);
  } finally {
    resetUIState();
  }
});

// Advanced section toggle
advancedToggle.addEventListener('click', () => {
  try {
    advancedContent.classList.toggle('hidden');
    advancedToggle.classList.toggle('active');
  } catch (error) {
    console.error('[Popup] ❌ Advanced toggle error:', error);
    showError('Failed to toggle advanced settings.', error);
  }
});

// Reset client ID to default
resetClientIdBtn.addEventListener('click', () => {
  try {
    customClientIdInput.value = '';
    customClientIdInput.focus();
    showError('Developer Client ID override cleared.');
  } catch (error) {
    console.error('[Popup] ❌ Reset client ID error:', error);
    showError('Failed to reset Client ID.', error);
  }
});

// Test refresh button
testRefreshBtn.addEventListener('click', async () => {
  try {
    console.log('[Popup] 🧪 Test refresh button clicked');
    testRefreshBtn.textContent = 'Testing...';
    testRefreshBtn.disabled = true;

    await safeSendMessage({ type: 'REFRESH_NOW' });
    showError('Test refresh completed! Check console logs.');
  } catch (error) {
    console.error('[Popup] ❌ Test refresh error:', error);
    showError('Test refresh failed. Try again.', error);
  } finally {
    resetUIState();
  }
});

// Test lists scraping button
testListsBtn.addEventListener('click', async () => {
  try {
    console.log('[Popup] 🧪 Test lists button clicked');
    testListsBtn.textContent = 'Testing...';
    testListsBtn.disabled = true;

    // Get current active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab.url?.includes('github.com')) {
      showError('Please navigate to your GitHub stars page first, then try again.');
      return;
    }

    console.log('[Popup] 📤 Sending test scrape message to active tab:', activeTab.url);

    // Send message directly to active tab
    const response = await chrome.tabs.sendMessage(activeTab.id!, { type: 'SCRAPE_STARS_PAGE' });

    if (response?.success) {
      const lists = response.data || [];
      showError(`Found ${lists.length} lists! Check console for details.`);
      console.log('[Popup] ✅ Test scraping result:', lists);
    } else {
      showError('Test failed: ' + (response?.error || 'Unknown error'));
      console.log('[Popup] ❌ Test scraping failed:', response);
    }
  } catch (error) {
    console.error('[Popup] ❌ Test lists error:', error);
    showError("Test failed. Make sure you're on GitHub.", error);
  } finally {
    resetUIState();
  }
});

// Version label click handler (7 clicks to unlock dev mode)
versionLabel.addEventListener('click', () => {
  try {
    if (!devModeEnabled) {
      handleVersionClick();
    }
  } catch (error) {
    console.error('[Popup] ❌ Version click error:', error);
  }
});

// Disable developer mode button
disableDevModeBtn.addEventListener('click', async () => {
  try {
    await saveDevModeState(false);
    showError('Developer Mode disabled. Diagnostics are now hidden.');
  } catch (error) {
    console.error('[Popup] ❌ Disable dev mode error:', error);
    showError('Failed to disable Developer Mode.', error);
  }
});

// Error banner close
document.addEventListener('click', (event) => {
  if ((event.target as HTMLElement)?.id === 'error-banner-close') {
    clearError();
  }
});

// Error notification close
document.querySelectorAll('.notification .btn-close').forEach((btn) => {
  btn.addEventListener('click', () => {
    try {
      errorNotification.classList.add('hidden');
    } catch (error) {
      console.error('[Popup] ❌ Error notification close error:', error);
    }
  });
});

/**
 * Initialize popup with error handling
 */
async function init(): Promise<void> {
  console.log('[Popup] ▶️  Initializing popup...');
  try {
    await updateState();
    console.log('[Popup] ✅ Popup initialized successfully');
  } catch (error) {
    console.error('[Popup] ❌ Error initializing popup:', error);
    showError('Failed to initialize. Try refreshing the page.', error);
  }
}

// Initialize popup on load
init().catch((error) => {
  console.error('[Popup] ❌ Fatal initialization error:', error);
  showError('Failed to start extension. Try reloading.', error);
});

console.log('[Popup] ✅ Popup fully loaded');
