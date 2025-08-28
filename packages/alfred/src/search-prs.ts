#!/usr/bin/env node

import { searchPullRequests, getGitHubAuthErrorInfo } from '@pullke/core';
import {
  createPullRequestItem,
  createErrorItem,
  createAlfredResult,
  outputAlfredResult,
} from './utils.js';

async function main() {
  try {
    // Get repository from Alfred environment variable
    const selectedRepo = process.env.selectedRepo;

    if (!selectedRepo) {
      const errorItem = createErrorItem(
        'No repository specified',
        'Expected selectedRepo environment variable from Alfred workflow'
      );
      outputAlfredResult(createAlfredResult([errorItem]));
      return;
    }

    const fullName = selectedRepo;
    console.error(`🔍 Using repository from Alfred: ${selectedRepo}`);
    const [owner, repo] = fullName.split('/');

    if (!owner || !repo) {
      const errorItem = createErrorItem(
        'Invalid repository format',
        'Expected format: owner/repo'
      );
      outputAlfredResult(createAlfredResult([errorItem]));
      return;
    }

    console.error(`🔍 Searching PRs in ${owner}/${repo}...`);

    // Search for the most recent 100 PRs (all states, sorted by updated)
    const result = await searchPullRequests({
      options: {
        owner,
        repo,
        states: ['all'],
        sort: 'updated',
        order: 'desc',
        maxResults: 100,
      },
    });

    if (!result.success) {
      if (
        result.error?.includes('authentication') ||
        result.error?.includes('token')
      ) {
        const authError = getGitHubAuthErrorInfo();
        const errorItem = createErrorItem(authError.title, authError.subtitle);
        outputAlfredResult(createAlfredResult([errorItem]));
        return;
      }

      const errorItem = createErrorItem(
        'Search Error',
        result.error || 'Unknown error occurred'
      );
      outputAlfredResult(createAlfredResult([errorItem]));
      return;
    }

    if (result.items.length === 0) {
      const errorItem = createErrorItem(
        'No PRs found',
        `No pull requests found in ${owner}/${repo}`
      );
      outputAlfredResult(createAlfredResult([errorItem]));
      return;
    }

    const alfredItems = result.items.map(createPullRequestItem);

    console.error(
      `✅ Found ${result.total_count} PRs, returning ${alfredItems.length} items ${result.cached ? '(cached)' : '(fresh)'}`
    );

    outputAlfredResult(createAlfredResult(alfredItems));
  } catch (error) {
    console.error('❌ Error:', error);

    const errorItem = createErrorItem(
      'Script Error',
      error instanceof Error ? error.message : 'Unknown error'
    );
    outputAlfredResult(createAlfredResult([errorItem]));
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
