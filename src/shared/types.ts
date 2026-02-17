/**
 * Shared TypeScript types for GitHub Stars + Lists extension
 */

// GitHub API types
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  language: string | null;
  starred_at?: string; // Optional, from GitHub API with Accept header
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface GitHubList {
  id: string; // Unique identifier (could be based on URL or metadata)
  name: string;
  description?: string;
  url: string; // Full URL to the list page
  repositories: GitHubRepository[];
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface StarredCache extends CacheEntry<GitHubRepository[]> {}

export interface ListsCache extends CacheEntry<GitHubList[]> {}

// Settings
export interface ExtensionSettings {
  autoRefreshEnabled: boolean;
  autoRefreshIntervalHours: number; // 1-168, default 6
  listsSyncEnabled: boolean; // default true
  customClientId?: string | null; // Optional override for GitHub OAuth Client ID
  includePrivateRepos: boolean; // Default true - requires 'repo' scope
  sessionOnlyToken: boolean; // Default false - store token in session storage
  darkMode: 'auto' | 'light' | 'dark'; // Default 'auto' - theme preference
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoRefreshEnabled: true,
  autoRefreshIntervalHours: 6,
  listsSyncEnabled: true,
  customClientId: null,
  includePrivateRepos: true,
  sessionOnlyToken: false,
  darkMode: 'auto',
};

// Message protocol (discriminated unions)
export type Message = AuthMessage | SyncMessage | SettingsMessage | StateMessage;

// Auth messages
export type AuthMessage =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_ABORT' }
  | { type: 'DISCONNECT' }
  | { type: 'SET_CLIENT_ID'; payload: string };

// Sync messages
export type SyncMessage = { type: 'REFRESH_NOW' } | { type: 'SYNC_ALARM' };

// Settings messages
export type SettingsMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ExtensionSettings> };

// State request
export type StateMessage = { type: 'GET_STATE' };

// Responses from background
export interface StateUpdate {
  isConnected: boolean;
  viewer?: GitHubUser;
  allStarred: GitHubRepository[];
  lists: GitHubList[];
  isLoggedIntoGitHub?: boolean; // true if user is logged into github.com
  lastSyncAllStarred?: number; // timestamp
  lastSyncLists?: number; // timestamp
  syncInProgress: boolean;
  listsSyncEnabled?: boolean; // whether list syncing is enabled
  error?: string;
}

export interface SyncProgress {
  stage: 'all_starred' | 'lists';
  status: 'in_progress' | 'success' | 'error';
  message?: string;
}

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'ghbm_token',
  VIEWER: 'ghbm_viewer',
  ALL_STARRED_CACHE: 'ghbm_all_starred_cache',
  LISTS_CACHE: 'ghbm_lists_cache',
  LAST_SYNC_ALL_STARRED: 'ghbm_last_sync_all_starred',
  LAST_SYNC_LISTS: 'ghbm_last_sync_lists',
  SETTINGS: 'ghbm_settings',
} as const;

// Content script message types
export type ContentScriptMessage =
  | { type: 'SCRAPE_STARS_PAGE' }
  | { type: 'SCRAPE_LIST_PAGE'; url: string };

export interface ScrapeResult {
  success: boolean;
  data?: GitHubList[] | GitHubList;
  error?: string;
}
