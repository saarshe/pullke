#!/usr/bin/env node

import {
  getGitHubToken,
  testGitHubAuthentication,
  getGitHubAuthErrorInfo,
} from '../../auth/index';

async function testAuth() {
  console.log('🔐 Testing GitHub Authentication...\n');

  console.log('1. Getting GitHub token...');
  const authResult = await getGitHubToken();

  if (authResult.success) {
    console.log(`✅ Token found: ${authResult.token?.slice(0, 8)}...`);

    console.log('\n2. Testing token validity...');
    const isValid = await testGitHubAuthentication();
    console.log(`Token valid: ${isValid ? '✅' : '❌'}`);

    if (isValid) {
      console.log('\n🎉 Authentication successful!');
    } else {
      console.log('\n❌ Authentication failed - token is invalid');
    }
  } else {
    console.log(`❌ Failed to get token: ${authResult.error}`);

    console.log('\n💡 To fix this:');
    const errorInfo = getGitHubAuthErrorInfo();
    console.log(`   ${errorInfo.title}`);
    console.log(`   ${errorInfo.subtitle}`);
    if (errorInfo.action) {
      console.log(`   Run: ${errorInfo.action}`);
    }
  }
}

// Run the test
testAuth().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
