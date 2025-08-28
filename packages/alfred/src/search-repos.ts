#!/usr/bin/env node

import { searchRepositories, getGitHubAuthErrorInfo } from '@pullke/core';
import {
  getAlfredConfig,
  createRepositoryItem,
  createErrorItem,
  createAlfredResult,
  outputAlfredResult,
} from './utils.js';

async function main() {
  try {
    const config = getAlfredConfig();

    console.error('🔍 Searching repositories...', config);

    const result = await searchRepositories({
      organizations: config.organizations,
      keywords: config.keywords,
      maxResults: 1000,
      maxPages: 10,
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

    const alfredItems = result.items.map(createRepositoryItem);

    console.error(
      `✅ Found ${result.total_count} repositories, returning ${alfredItems.length} items`
    );

    outputAlfredResult(createAlfredResult(alfredItems));
  } catch (error) {
    console.error('❌ Error:', error);

    if (error instanceof Error && error.message.includes('organizations')) {
      const errorItem = createErrorItem(
        'Organizations not set',
        'Configure organizations in Alfred workflow settings'
      );
      outputAlfredResult(createAlfredResult([errorItem]));
      return;
    }

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
