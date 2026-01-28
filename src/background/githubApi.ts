/**
 * GitHub REST API client for fetching starred repositories
 */

import {
  API_PER_PAGE,
  ERRORS,
} from '../shared/constants';
import { API_BASE_URL } from '../shared/authConfig';
import { GitHubRepository } from '../shared/types';
import { fetchWithTimeout, parseLinkHeader } from '../shared/utils';

/**
 * Fetch paginated list of starred repos for authenticated user
 * Supports private repos via authenticated token
 */
export async function fetchAllStarred(token: string): Promise<GitHubRepository[]> {
  const allRepos: GitHubRepository[] = [];
  let nextUrl: string | undefined = `${API_BASE_URL}/user/starred?per_page=${API_PER_PAGE}&sort=created&direction=desc`;

  while (nextUrl) {
    try {
      const response = await fetchWithTimeout(nextUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'github-stars-lists-extension',
        },
      });

      if (response.status === 403) {
        throw new Error(ERRORS.RATE_LIMITED);
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch starred repos: ${response.status} ${response.statusText}`
        );
      }

      const repos: GitHubRepository[] = await response.json();
      allRepos.push(...repos);

      // Parse Link header for pagination
      const linkHeader = response.headers.get('link');
      const links = parseLinkHeader(linkHeader);
      nextUrl = links.next;

    } catch (error) {
      console.error('Error fetching starred repos:', error);
      throw error;
    }
  }

  return allRepos;
}

/**
 * Get a single repository by owner and name
 */
export async function fetchRepository(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  const url = `${API_BASE_URL}/repos/${owner}/${repo}`;

  const response = await fetchWithTimeout(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'github-stars-lists-extension',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch repository: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get user's authentication status via API
 */
export async function checkAuthStatus(token: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'github-stars-lists-extension',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
