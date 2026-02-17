/**
 * GitHub OAuth Device Flow handler
 * Manages authentication without needing a backend server
 */

import { DEVICE_CODE_URL, TOKEN_URL, API_BASE_URL, getOAuthScopes } from '../shared/authConfig';
import {
  DEVICE_FLOW_INITIAL_INTERVAL_SECONDS,
  DEVICE_FLOW_MAX_INTERVAL_SECONDS,
  DEVICE_FLOW_EXPIRES_IN_SECONDS,
} from '../shared/constants';
import { STORAGE_KEYS } from '../shared/types';
import { sleep, fetchWithTimeout } from '../shared/utils';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

let pollAbort: AbortController | null = null;

/**
 * Initiate device flow: request device code from GitHub
 */
export async function requestDeviceCode(
  clientId: string,
  includePrivateRepos: boolean
): Promise<DeviceCodeResponse> {
  const scopes = getOAuthScopes(includePrivateRepos);

  const response = await fetchWithTimeout(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: scopes.join(' '),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get device code: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll token endpoint until user authorizes or timeout
 */
export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number = DEVICE_FLOW_INITIAL_INTERVAL_SECONDS,
  maxAttempts: number = DEVICE_FLOW_EXPIRES_IN_SECONDS / DEVICE_FLOW_INITIAL_INTERVAL_SECONDS
): Promise<string> {
  pollAbort = new AbortController();
  let attempt = 0;
  let currentInterval = interval;

  while (attempt < maxAttempts && !pollAbort.signal.aborted) {
    try {
      const response = await fetchWithTimeout(TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
        signal: pollAbort.signal,
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const data: TokenResponse = await response.json();

      // Handle various response codes
      if (data.error) {
        if (data.error === 'authorization_pending') {
          // User hasn't authorized yet, keep polling
          await sleep(currentInterval * 1000);
          // Respect slow_down if returned
          currentInterval = Math.min(currentInterval + 5, DEVICE_FLOW_MAX_INTERVAL_SECONDS);
          attempt++;
          continue;
        } else if (data.error === 'slow_down') {
          // Slow down polling
          currentInterval += 5;
          await sleep(currentInterval * 1000);
          attempt++;
          continue;
        } else if (data.error === 'expired_token') {
          throw new Error('Device code expired. Please try again.');
        } else if (data.error === 'access_denied') {
          throw new Error('Authorization denied.');
        } else {
          throw new Error(`OAuth error: ${data.error}`);
        }
      }

      if (data.access_token) {
        return data.access_token;
      }

      throw new Error('No access token in response');
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('signal')) {
        // Aborted by user
        throw new Error('Authorization cancelled.');
      }
      throw error;
    }
  }

  throw new Error('Device code authorization timed out.');
}

/**
 * Abort ongoing token polling
 */
export function abortTokenPoll(): void {
  if (pollAbort) {
    pollAbort.abort();
    pollAbort = null;
  }
}

/**
 * Fetch authenticated user info
 */
export async function fetchViewerIdentity(token: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Validate token by fetching user info
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    await fetchViewerIdentity(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Store token securely based on settings
 * Never logs the token value
 */
export async function storeToken(token: string, sessionOnly: boolean = false): Promise<void> {
  // Never log the actual token
  console.log('[Auth] Storing token (value hidden for security)');

  const storage =
    sessionOnly && chrome.storage.session ? chrome.storage.session : chrome.storage.local;

  await storage.set({
    [STORAGE_KEYS.TOKEN]: token,
  });
}

/**
 * Retrieve token from storage
 * Never logs the token value
 */
export async function getToken(sessionOnly: boolean = false): Promise<string | null> {
  const storage =
    sessionOnly && chrome.storage.session ? chrome.storage.session : chrome.storage.local;

  const data = await storage.get([STORAGE_KEYS.TOKEN]);
  const token = data[STORAGE_KEYS.TOKEN] || null;

  // Never log the actual token
  if (token) {
    console.log('[Auth] Token retrieved from storage (value hidden for security)');
  }

  return token;
}

/**
 * Clear token from both storages
 */
export async function clearToken(): Promise<void> {
  console.log('[Auth] Clearing token from all storage');

  // Clear from both local and session storage
  await chrome.storage.local.remove([STORAGE_KEYS.TOKEN]);

  if (chrome.storage.session) {
    await chrome.storage.session.remove([STORAGE_KEYS.TOKEN]);
  }
}

/**
 * Get cached viewer info
 */
export async function getCachedViewer() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.VIEWER]);
  return data[STORAGE_KEYS.VIEWER];
}

/**
 * Store viewer info
 */
export async function storeViewer(viewer: any): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.VIEWER]: viewer,
  });
}

/**
 * Clear viewer cache
 */
export async function clearViewer(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEYS.VIEWER]);
}
