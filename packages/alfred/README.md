# @pullke/alfred

Alfred workflow package for searching GitHub repositories using the @pullke/core functionality.

## Overview

This package provides TypeScript-based scripts that integrate with Alfred workflows for searching GitHub repositories. It uses the core package's `searchRepositories` function and outputs Alfred-compatible JSON for script filters.

## Features

- 🔍 **Repository Search**: Search across multiple GitHub organizations with keyword filtering
- 🔐 **GitHub CLI Authentication**: Uses your existing `gh auth` setup
- ⚡ **Alfred Integration**: Outputs properly formatted JSON for Alfred script filters
- 🎯 **Modifier Support**: Built-in support for copy URL (⌘) and open PRs (⇧) actions
- 🧹 **Cache Management**: Clear repository cache when needed

## Scripts

### search-repos.js
Main script for searching repositories. Reads configuration from environment variables:

**Environment Variables:**
- `organizations` (required): Comma-separated list of GitHub organizations
- `keywords` (optional): Comma-separated list of keywords to filter repositories
- `cache_ttl_hours` (optional): Cache TTL in hours (default: 168 = 7 days)

**Alfred Output:**
- **Enter**: Open repository in browser
- **⌘+Enter**: Copy repository URL to clipboard  
- **⇧+Enter**: Open repository's pull requests page

### test-auth.js
Test script to verify GitHub authentication is working.

### clear-cache.js
Script to clear the repository cache, forcing fresh data on next search.

## Usage

### Building
```bash
npm run build
```

### Testing
```bash
# Test authentication
npm run test:auth

# Test repository search with sample data
npm run test:search

# Clear cache
npm run clear-cache
```

### Manual Testing
```bash
# Search with custom parameters
organizations="myorg,anotherorg" keywords="react,typescript" node dist/search-repos.js

# Test authentication
node dist/test-auth.js

# Clear cache
node dist/clear-cache.js
```

## Alfred Integration

To use these scripts in an Alfred workflow:

1. Build the package: `npm run build`
2. Create a Script Filter in Alfred with:
   - **Script**: `node /path/to/pullke/packages/alfred/dist/search-repos.js`
   - **Language**: `/bin/bash`
   - **Environment Variables**: Set `organizations`, `keywords`, etc.

3. Connect to:
   - **Open URL Action**: For main action (Enter)
   - **Copy to Clipboard**: For ⌘ modifier
   - **Open URL Action**: For ⇧ modifier (add `/pulls` to URL)

## Environment Configuration

Set these environment variables in your Alfred workflow configuration:

```bash
organizations="microsoft,facebook,google"
keywords="react,typescript,vue,angular"
cache_ttl_hours="168"
```

## Authentication

The scripts use GitHub CLI authentication. Ensure you have:

1. GitHub CLI installed: `brew install gh`
2. Authenticated with GitHub: `gh auth login`

## Output Format

The scripts output Alfred Script Filter JSON format:

```json
{
  "items": [
    {
      "uid": "owner/repo-name",
      "title": "repo-name",
      "subtitle": "Description | Language • ⭐ stars",
      "arg": "https://github.com/owner/repo-name",
      "valid": true,
    }
  ]
}
```

## Error Handling

The scripts provide helpful error messages for common issues:

- **Authentication errors**: Displays GitHub CLI setup instructions
- **Missing configuration**: Shows which environment variables are required
- **Network errors**: Graceful handling with user-friendly messages

## Dependencies

- **@pullke/core**: Core repository search functionality
- **Node.js 18+**: Runtime environment
- **GitHub CLI**: For authentication

## Development

The package follows the same patterns as your existing Python Alfred workflow but with improved TypeScript integration and better error handling.
