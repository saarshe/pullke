#!/usr/bin/env tsx

/**
 * Test script for pull request search functionality
 *
 * Usage:
 *   tsx test-pr-search.ts
 */

import { searchPullRequests } from '../../github/pull-requests/search';
import { PullRequestSearchOptions } from '../../types/github';

async function main() {
  console.log('🧪 Testing Pull Request Search Functionality\n');

  // Test 1: Basic search for open PRs
  console.log('📋 Test 1: Search open PRs in microsoft/vscode');
  try {
    const options1: PullRequestSearchOptions = {
      owner: 'microsoft',
      repo: 'vscode',
      states: ['open'],
      maxResults: 5,
    };

    const result1 = await searchPullRequests({ options: options1 });
    console.log(`✅ Found ${result1.items.length} open PRs`);

    if (result1.items.length > 0) {
      const pr = result1.items[0];
      console.log(`   📌 Latest PR: #${pr.number} - ${pr.title}`);
      console.log(`   👤 Author: ${pr.user?.login}`);
      console.log(
        `   📅 Created: ${new Date(pr.created_at).toLocaleDateString()}`
      );
      console.log(`   🔗 URL: ${pr.html_url}`);
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 2: Search for multiple states (open and draft PRs)
  console.log(
    '📋 Test 2: Search for both open and draft PRs in facebook/react'
  );
  try {
    const options2: PullRequestSearchOptions = {
      owner: 'facebook',
      repo: 'react',
      states: ['open', 'draft'],
      maxResults: 3,
    };

    const result2 = await searchPullRequests({ options: options2 });
    console.log(`✅ Found ${result2.items.length} open or draft PRs`);

    result2.items.forEach((pr, index) => {
      console.log(`   ${index + 1}. #${pr.number} - ${pr.title}`);
      console.log(
        `      👤 ${pr.user?.login} | 🔄 State: ${pr.state}${pr.draft ? ' (draft)' : ''}${pr.pull_request?.merged_at ? ' (merged)' : ''}`
      );
    });
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 3: Search with text query
  console.log('📋 Test 3: Search PRs with text query');
  try {
    const options3: PullRequestSearchOptions = {
      owner: 'microsoft',
      repo: 'vscode',
      query: 'accessibility',
      states: ['all'],
      maxResults: 3,
      sort: 'updated',
      order: 'desc',
    };

    const result3 = await searchPullRequests({ options: options3 });
    console.log(
      `✅ Found ${result3.items.length} PRs mentioning "accessibility"`
    );

    result3.items.forEach((pr, index) => {
      console.log(`   ${index + 1}. #${pr.number} - ${pr.title}`);
      console.log(
        `      👤 ${pr.user?.login} | 📅 ${new Date(pr.created_at).toLocaleDateString()}`
      );
    });
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('\n🎉 Pull Request search tests completed!');
}

// Run the main function
main().catch(console.error);
