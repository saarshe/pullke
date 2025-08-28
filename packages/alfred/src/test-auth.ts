#!/usr/bin/env node

import { testGitHubAuthentication, getGitHubAuthErrorInfo } from '@pullke/core';
import {
  createErrorItem,
  createAlfredResult,
  outputAlfredResult,
} from './utils.js';

async function main() {
  try {
    console.error('🔐 Testing GitHub authentication...');

    const isAuthenticated = await testGitHubAuthentication();

    if (isAuthenticated) {
      console.error('✅ Authentication successful!');
      const successItem = {
        uid: 'auth-success',
        title: '✅ GitHub Authentication Successful',
        subtitle: 'You can now search repositories',
        arg: '',
        valid: false,
      };
      outputAlfredResult(createAlfredResult([successItem]));
    } else {
      console.error('❌ Authentication failed');
      const authError = getGitHubAuthErrorInfo();
      const errorItem = createErrorItem(authError.title, authError.subtitle);
      outputAlfredResult(createAlfredResult([errorItem]));
    }
  } catch (error) {
    console.error('❌ Error testing authentication:', error);
    const errorItem = createErrorItem(
      'Authentication Test Failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    outputAlfredResult(createAlfredResult([errorItem]));
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
