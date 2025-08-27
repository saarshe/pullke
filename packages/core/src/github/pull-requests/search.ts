import { Octokit } from '@octokit/rest';
import { createOctokitClient } from '../client';
import {
  PullRequestSearchOptions,
  PullRequestSearchResult,
} from '../../types/github';

/**
 * Search pull requests in a specific repository using GitHub Search API
 */
export async function searchPullRequests({
  options,
}: {
  options: PullRequestSearchOptions;
}): Promise<PullRequestSearchResult> {
  try {
    const octokit = await createOctokitClient();
    console.debug(
      `🔍 Searching pull requests in ${options.owner}/${options.repo} using Search API...`
    );

    const query = buildSearchQuery(options);
    console.debug(`📝 Search query: "${query}"`);

    const searchParams = {
      q: query,
      per_page: Math.min(options.maxResults || 100, 100),
      sort: (options.sort === 'created' ? 'created' : 'updated') as
        | 'created'
        | 'updated',
      order: (options.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
      advanced_search: 'true',
    };

    const searchResult =
      await octokit.rest.search.issuesAndPullRequests(searchParams);

    const pullRequests = searchResult.data.items;

    console.debug(`✅ Found ${pullRequests.length} pull requests`);

    return {
      success: true,
      items: pullRequests,
      total_count: searchResult.data.total_count,
      incomplete_results: searchResult.data.incomplete_results,
      cached: false,
    };
  } catch (error) {
    console.error('❌ Pull request search failed:', error);
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
 * Build GitHub Search API query string from options
 */
function buildSearchQuery(options: PullRequestSearchOptions): string {
  const queryParts: string[] = [];

  queryParts.push(`repo:${options.owner}/${options.repo}`);
  queryParts.push('is:pr');

  if (
    options.states &&
    options.states.length > 0 &&
    !options.states.includes('all')
  ) {
    const stateQueries: string[] = [];

    if (options.states.includes('open')) {
      stateQueries.push('is:open');
    }
    if (options.states.includes('closed')) {
      stateQueries.push('is:closed');
    }
    if (options.states.includes('merged')) {
      stateQueries.push('is:merged');
    }
    if (options.states.includes('draft')) {
      stateQueries.push('is:draft');
    }

    if (stateQueries.length > 1) {
      queryParts.push(`(${stateQueries.join(' OR ')})`);
    } else if (stateQueries.length === 1) {
      queryParts.push(stateQueries[0]);
    }
  }

  if (options.author) {
    queryParts.push(`author:${options.author}`);
  }

  if (options.assignee) {
    queryParts.push(`assignee:${options.assignee}`);
  }

  if (options.labels && options.labels.length > 0) {
    options.labels.forEach(label => {
      // Wrap label in quotes if it contains spaces
      const labelQuery = label.includes(' ') ? `"${label}"` : label;
      queryParts.push(`label:${labelQuery}`);
    });
  }

  if (options.dateFrom) {
    queryParts.push(`created:>=${options.dateFrom}`);
  }
  if (options.dateTo) {
    queryParts.push(`created:<=${options.dateTo}`);
  }

  if (options.query) {
    // Add the text query - GitHub will search in title and body
    queryParts.push(options.query);
  }

  return queryParts.join(' ');
}
