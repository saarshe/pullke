import { Octokit } from '@octokit/rest';
import { createOctokitClient } from '../client';
import { Repository, SearchOptions, SearchResult } from '../../types/github';

/**
 * Search repositories across multiple organizations
 */
export async function searchRepositories(
  options: SearchOptions
): Promise<SearchResult> {
  try {
    const octokit = await createOctokitClient();
    const allRepos: Repository[] = [];

    console.debug(
      `🔍 Searching in ${options.organizations.length} organizations...`
    );

    for (const org of options.organizations) {
      console.debug(`   Searching in organization: ${org}`);

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
      console.debug(`   Query: ${searchQuery}`);

      const orgRepos = await searchRepositoriesInOrg(
        octokit,
        searchQuery,
        options
      );
      allRepos.push(...orgRepos);

      console.debug(`   Found ${orgRepos.length} repos in ${org}`);
    }

    // Remove duplicates by full_name
    const uniqueRepos = Array.from(
      new Map(allRepos.map(repo => [repo.full_name, repo])).values()
    );

    console.debug(`✅ Total unique repositories found: ${uniqueRepos.length}`);

    return {
      success: true,
      items: uniqueRepos,
      total_count: uniqueRepos.length,
      incomplete_results: false,
      cached: false,
    };
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
 * Search repositories in a single organization with pagination
 */
async function searchRepositoriesInOrg(
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

      console.debug(
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
