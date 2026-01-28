/**
 * Configuration constants for GitLists extension
 * These are the default values used across the extension.
 */

import { getOAuthScopes } from './authConfig';

/**
 * GitHub OAuth Client ID (injected at build time via ESBuild define)
 * ESBuild will replace INJECTED_GITHUB_CLIENT_ID with the actual value
 */
declare const INJECTED_GITHUB_CLIENT_ID: string;

/**
 * Get the GitHub OAuth Client ID (injected at build time)
 */
function getInjectedClientId(): string {
  return INJECTED_GITHUB_CLIENT_ID;
}

/**
 * Validate that the OAuth Client ID has been properly configured
 * Shows error message if not configured
 */
export function assertClientIdConfigured(): void {
  const clientId = getInjectedClientId();
  if (!clientId || clientId === "") {
    const message = 'GitHub OAuth Client ID not configured. Extension cannot connect to GitHub.';
    console.error(`[GitLists] ${message}`);
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
  const clientId = getInjectedClientId();
  if (clientId && clientId !== "") {
    return clientId.trim();
  }
  
  // 3. No client ID available
  assertClientIdConfigured();
  return null;
}

/**
 * Get user-friendly error message when no client ID is available
 */
export function getClientIdErrorMessage(): string {
  const clientId = getInjectedClientId();
  if (!clientId || clientId === "") {
    return 'Extension not properly configured. Please contact the developer.';
  }
  return 'GitHub Client ID is required to connect to GitHub.';
}
