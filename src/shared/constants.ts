/**
 * Constants for the GitHub Stars + Lists extension
 */

// Device flow polling constants
export const DEVICE_FLOW_INITIAL_INTERVAL_SECONDS = 5;
export const DEVICE_FLOW_MAX_INTERVAL_SECONDS = 120;
export const DEVICE_FLOW_EXPIRES_IN_SECONDS = 900; // 15 minutes

// API pagination
export const API_PER_PAGE = 100;
export const API_TIMEOUT_MS = 30000;

// Alarm names
export const SYNC_ALARM_NAME = 'GITHUB_STARS_SYNC_ALARM';

// Min/max auto-refresh interval
export const MIN_REFRESH_HOURS = 1;
export const MAX_REFRESH_HOURS = 168; // 1 week

// Default values
export const DEFAULT_REFRESH_HOURS = 6;

// Error messages
export const ERRORS = {
  NO_TOKEN: 'Not connected to GitHub. Click "Connect GitHub" to authorize.',
  NOT_LOGGED_INTO_GITHUB: 'Sign into GitHub in this browser to sync Lists',
  API_ERROR: 'Failed to fetch from GitHub API',
  SCRAPE_ERROR: 'Failed to scrape GitHub lists',
  RATE_LIMITED: 'GitHub API rate limit exceeded. Try again later.',
  NETWORK_ERROR: 'Network error. Check your connection.',
} as const;

// GitHub Lists scraper selectors (may need updates if GitHub changes)
export const GITHUB_SCRAPER_SELECTORS = {
  // Stars page list items
  LIST_ITEM: '[data-filterable-for="your-lists"] a[href*="/stars/lists/"]',
  LIST_ITEM_NAME: 'span',

  // List page repo items
  REPO_ITEM: 'div[class*="Box-row"]',
  REPO_LINK: 'a[data-testid="item-title"]',
  REPO_OWNER_AVATAR: 'img[alt*="avatar"]',
} as const;

// Rate limit retry backoff (ms)
export const BACKOFF_MS = [100, 500, 2000, 5000];
