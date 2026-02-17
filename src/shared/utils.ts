/**
 * Utility functions for the extension
 */

import { API_TIMEOUT_MS } from './constants';

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse Link header for pagination
 */
export function parseLinkHeader(linkHeader: string | null): { next?: string; last?: string } {
  if (!linkHeader) return {};

  const links: Record<string, string> = {};
  const parts = linkHeader.split(',');

  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      const [, url, rel] = match;
      links[rel] = url;
    }
  }

  return { next: links.next, last: links.last };
}

/**
 * Format timestamp for display
 */
export function formatLastSyncTime(timestamp?: number): string {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Create a unique cache ID for a list
 */
export function createListId(url: string, name: string): string {
  // Extract list identifier from GitHub URL
  // e.g., https://github.com/username/stars/lists/mylist -> mylist
  const match = url.match(/\/lists\/([^/?]+)/);
  if (match) return match[1];

  // Fallback to name hash
  return `list_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('fetch');
  }
  return false;
}

/**
 * Extract owner and repo name from full_name or URL
 */
export function parseRepoName(fullName: string): { owner: string; name: string } {
  const [owner, name] = fullName.split('/');
  return { owner: owner || '', name: name || '' };
}

/**
 * Build GitHub repo URL
 */
export function buildRepoUrl(owner: string, name: string): string {
  return `https://github.com/${owner}/${name}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}
