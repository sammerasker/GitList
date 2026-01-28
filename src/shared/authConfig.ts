/**
 * Authentication configuration - Single source of truth for OAuth settings
 * All auth-related code should import from this file
 */

/**
 * GitHub OAuth scopes
 * - 'repo': Full access to private and public repositories (required for private starred repos)
 * - 'read:user': Read access to user profile information
 */
export const OAUTH_SCOPES = ['repo', 'read:user'] as const;

/**
 * Minimal OAuth scopes (when private repos are disabled)
 * - 'read:user': Read access to user profile information only
 */
export const OAUTH_SCOPES_MINIMAL = ['read:user'] as const;

/**
 * GitHub OAuth Device Flow endpoints
 */
export const DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * GitHub API configuration
 */
export const API_BASE_URL = 'https://api.github.com';
export const API_VERSION_HEADER = 'application/vnd.github.v3+json';

/**
 * Get OAuth scopes based on settings
 */
export function getOAuthScopes(includePrivateRepos: boolean): readonly string[] {
  return includePrivateRepos ? OAUTH_SCOPES : OAUTH_SCOPES_MINIMAL;
}