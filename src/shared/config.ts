/**
 * Configuration constants for GitLink extension
 * These are the default values used across the extension.
 */

import { getOAuthScopes } from './authConfig';

/**
 * GitHub OAuth Client ID (injected at build time)
 * This placeholder is replaced by ESBuild during the build process
 */
export const GITHUB_OAUTH_CLIENT_ID = "__GITLINK_OAUTH_CLIENT_ID__";

/**
 * Validate that the OAuth Client ID has been properly configured
 * Throws in development, shows friendly error in production
 */
export function assertClientIdConfigured(): void {
  if (GITHUB_OAUTH_CLIENT_ID === "__GITLINK_OAUTH_CLIENT_ID__" || !GITHUB_OAUTH_CLIENT_ID) {
    const isDev = process.env.NODE_ENV === 'development';
    const message = 'GitHub OAuth Client ID not configured. Extension cannot connect to GitHub.';
    
    if (isDev) {
      throw new Error(`[DEV] ${message} Check build configuration.`);
    } else {
      console.error(`[GitLink] ${message}`);
    }
  }
}

/**
 * Resolve the GitHub Client ID to use
 * Priority: 1) Developer override (dev mode only) 2) Build-time injected Client ID
 */
export async function resolveClientId(): Promise<string | null> {
  try {
    // 1. Check for developer override in storage (only in dev mode)
    const devData = await chrome.storage.local.get(['devModeEnabled', 'githubClientIdOverride']);
    if (devData.devModeEnabled && devData.githubClientIdOverride && devData.githubClientIdOverride.trim()) {
      return devData.githubClientIdOverride.trim();
    }
  } catch (error) {
    console.warn('[Config] Failed to check developer override:', error);
  }
  
  // 2. Use the build-time injected client ID
  if (GITHUB_OAUTH_CLIENT_ID && GITHUB_OAUTH_CLIENT_ID !== "__GITLINK_OAUTH_CLIENT_ID__") {
    return GITHUB_OAUTH_CLIENT_ID.trim();
  }
  
  // 3. No client ID available
  assertClientIdConfigured();
  return null;
}

/**
 * Get user-friendly error message when no client ID is available
 */
export function getClientIdErrorMessage(): string {
  if (GITHUB_OAUTH_CLIENT_ID === "__GITLINK_OAUTH_CLIENT_ID__" || !GITHUB_OAUTH_CLIENT_ID) {
    return 'Extension not properly configured. Please contact the developer.';
  }
  return 'GitHub Client ID is required to connect to GitHub.';
}
