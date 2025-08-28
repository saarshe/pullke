#!/usr/bin/env node

import { clearAllCache, getCacheInfo } from '@pullke/core';
import { createAlfredResult, outputAlfredResult } from './utils.js';

async function main() {
  try {
    console.error('🧹 Clearing cache...');

    const cacheInfo = await getCacheInfo();

    if (cacheInfo.files === 0) {
      console.error('ℹ️ No cache files found');

      outputAlfredResult(
        createAlfredResult([
          {
            uid: 'no-cache',
            title: 'ℹ️ No Cache to Clear',
            subtitle: 'Cache directory is already empty',
            arg: '',
            valid: false,
          },
        ])
      );
      return;
    }

    const result = await clearAllCache();

    if (result.errors > 0) {
      console.error(
        `⚠️ Cache cleared with errors: ${result.removed} removed, ${result.errors} errors`
      );

      outputAlfredResult(
        createAlfredResult([
          {
            uid: 'cache-partial',
            title: '⚠️ Cache Partially Cleared',
            subtitle: `${result.removed} files cleared, ${result.errors} errors occurred`,
            arg: '',
            valid: false,
          },
        ])
      );
    } else {
      console.error(
        `✅ Cache cleared successfully: ${result.removed} files removed`
      );

      outputAlfredResult(
        createAlfredResult([
          {
            uid: 'cache-cleared',
            title: '✅ Cache Cleared',
            subtitle: `${result.removed} cache files removed - next search will fetch fresh data`,
            arg: '',
            valid: false,
          },
        ])
      );
    }
  } catch (error) {
    console.error('❌ Error clearing cache:', error);

    outputAlfredResult(
      createAlfredResult([
        {
          uid: 'cache-error',
          title: '❌ Cache Clear Failed',
          subtitle: error instanceof Error ? error.message : 'Unknown error',
          arg: '',
          valid: false,
        },
      ])
    );
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
