#!/usr/bin/env node

import { searchRepositories } from '../../github/repositories/search';

async function testRepoSearch() {
  console.log('🔍 Testing Repository Search...\n');

  // Test search with some common orgs and keywords
  const searchOptions = {
    organizations: ['microsoft', 'facebook'],
    keywords: 'react, vscode, vite, typescript, javascript',
    maxResults: 100,
    maxPages: 4,
  };

  console.log('Search options:', searchOptions);
  console.log('');

  const result = await searchRepositories(searchOptions);

  if (result.success) {
    console.log(`\n🎉 Found ${result.total_count} repositories!`);
    console.log('\n📊 Top 10 results:');

    result.items.slice(0, 10).forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.name}`);
      console.log(`   ${repo.full_name}`);
      if (repo.description) {
        console.log(`   📝 ${repo.description}`);
      }
      if (repo.language) {
        console.log(`   💻 ${repo.language} • ⭐ ${repo.stargazers_count}`);
      }
      console.log(`   🔗 ${repo.html_url}`);
      console.log('');
    });
  } else {
    console.log('❌ Search failed:', result.error);
  }
}

// Run the test
testRepoSearch().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
