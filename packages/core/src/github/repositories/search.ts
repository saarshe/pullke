import { Octokit } from '@octokit/rest';
import { createOctokitClient } from '../client';
import { Repository, SearchOptions, SearchResult } from '../../types/github';
import {
  generateRepoSearchCacheKey,
  getFromCacheOrFetch,
} from '../../cache/index';

/**
 * Search repositories across multiple organizations
 */
export async function searchRepositories(
  options: SearchOptions
): Promise<SearchResult> {
  try {
    const useCache = options.useCache ?? true;

    if (useCache) {
      const cacheKey = generateRepoSearchCacheKey(
        options.organizations,
        options.keywords,
        options.includeCurrentUser
      );

      const result = await getFromCacheOrFetch({
        key: cacheKey,
        fetchFn: () => fetchRepositoriesFromGitHub(options),
        customTtl: options.cacheTtl, // If not provided, will use default repo TTL (1 week)
      });

      return {
        success: true,
        items: result.data,
        total_count: result.data.length,
        incomplete_results: false,
        cached: result.cached,
      };
    } else {
      // Skip cache and fetch directly
      const repos = await fetchRepositoriesFromGitHub(options);
      return {
        success: true,
        items: repos,
        total_count: repos.length,
        incomplete_results: false,
        cached: false,
      };
    }
  } catch (error) {
    console.error('❌ Repository search failed:', error);
    return {
      success: false,
      items: [],
      total_count: 0,
      incomplete_results: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch repositories from GitHub (without caching)
 */
async function fetchRepositoriesFromGitHub(
  options: SearchOptions
): Promise<Repository[]> {
  const octokit = await createOctokitClient();
  const allRepos: Repository[] = [];

  console.error(
    `🔍 Searching in ${options.organizations.length} organizations...`
  );

  for (const org of options.organizations) {
    console.error(`   Searching in organization: ${org}`);

    const queryParts = [`org:${org}`];

    if (options.keywords) {
      const keywordList = options.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);
      if (keywordList.length > 0) {
        const keywordsOr = keywordList.join(' OR ');
        queryParts.push(`(${keywordsOr})`);
      }
    }

    const searchQuery = queryParts.join(' ');
    console.error(`   Query: ${searchQuery}`);

    const orgRepos = await searchRepositoriesInOrgOrUser(
      octokit,
      searchQuery,
      options
    );
    allRepos.push(...orgRepos);

    console.error(`   Found ${orgRepos.length} repos in ${org}`);
  }

  if (options.includeCurrentUser) {
    console.error(`   Searching in current user's repositories...`);

    const userQuery = 'user:@me';
    console.error(`   Query: ${userQuery}`);

    const userRepos = await searchRepositoriesInOrgOrUser(
      octokit,
      userQuery,
      options
    );
    allRepos.push(...userRepos);

    console.error(`   Found ${userRepos.length} repos in current user`);
  }

  // Remove duplicates by full_name
  const uniqueRepos = Array.from(
    new Map(allRepos.map(repo => [repo.full_name, repo])).values()
  );

  console.error(`✅ Total unique repositories found: ${uniqueRepos.length}`);
  return uniqueRepos;
}

/**
 * Search repositories in a single organization or user with pagination
 */
async function searchRepositoriesInOrgOrUser(
  octokit: Octokit,
  query: string,
  options: SearchOptions
): Promise<Repository[]> {
  const repos: Repository[] = [];
  const maxPages = options.maxPages || 10; // GitHub Search API limit
  const perPage = 100;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const response = await octokit.rest.search.repos({
        q: query,
        sort: 'updated',
        order: 'desc',
        per_page: perPage,
        page,
      });

      const pageRepos = response.data.items;
      repos.push(...pageRepos);

      console.error(
        `     Page ${page}: ${pageRepos.length} repos (total: ${repos.length})`
      );

      // Stop if we got fewer results than requested (last page)
      if (pageRepos.length < perPage) {
        break;
      }

      if (options.maxResults && repos.length >= options.maxResults) {
        break;
      }
    }
  } catch (error) {
    console.error(`Error searching repositories: ${error}`);
    // Don't throw - return what we have so far
  }

  // Limit results if specified
  if (options.maxResults && repos.length > options.maxResults) {
    return repos.slice(0, options.maxResults);
  }

  return repos;
}
