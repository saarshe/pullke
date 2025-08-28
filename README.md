# Pullke 🍗

A modular TypeScript library for searching GitHub repositories and pull requests with authentication, designed with a core-first architecture.

## Features

### 🔍 Repository Search
- **Multi-organization search** - Search across multiple GitHub organizations simultaneously
- **Keyword filtering** - Filter repositories by keywords with OR logic support
- **Intelligent pagination** - Automatic handling of GitHub API pagination limits
- **Flexible results** - Configurable result limits and sorting options

### 🔀 Pull Request Search  
- **Advanced filtering** - Search by state (open/closed/merged/draft), author, assignee, labels
- **Date range queries** - Filter PRs by creation date ranges
- **Text search** - Search within PR titles and descriptions
- **Comprehensive sorting** - Sort by creation date or last updated

### 🔐 Authentication
- **GitHub CLI integration** - Seamless authentication via `gh auth token`
- **Token caching** - Intelligent token caching for performance
- **Error handling** - Clear error messages and recovery suggestions

### ⚡ Intelligent Caching
- **TTL-based caching** - Cache GitHub API responses with configurable expiration (default: 7 days)
- **Performance optimization** - Cache hits are 50-100x faster than API calls
- **Rate limiting protection** - Reduces GitHub API calls to avoid rate limits
- **Persistent storage** - File-based cache survives application restarts

## Project Structure

This is a monorepo with the following packages:

- **`@pullke/core`** - Core functionality for GitHub API interactions, search, and authentication
- **`@pullke/alfred`** - Alfred workflow consumer (planned)

## Architecture

The project follows a core-first architecture where:

1. **Core Package** (`@pullke/core`) contains all the business logic
2. **Consumer Packages** (like `@pullke/alfred`) use the core functionality and provide different interfaces

This approach allows for:

- 🎯 **Modularity**: Clear separation of concerns
- 🔧 **Extensibility**: Easy to add new consumers (CLI, browser extensions, etc.)
- 📦 **Shareability**: Core can be used independently
- 🧪 **Testability**: Core logic can be tested in isolation

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn 4.x
- GitHub CLI (`gh`) installed and authenticated

### Installation

```bash
# Install dependencies for all packages
yarn install

# Build all packages
yarn build
```

### Usage Example

```typescript
import { searchRepositories, searchPullRequests, clearAllCache } from '@pullke/core';

// Search repositories across organizations with caching
const repos = await searchRepositories({
  organizations: ['facebook', 'microsoft'],
  keywords: 'react,typescript',
  maxResults: 50,
  useCache: true,       // Enable caching (default)
  cacheTtl: 3600        // Cache for 1 hour (default: 7 days)
});

console.log(`Found ${repos.items.length} repos (cached: ${repos.cached})`);

// Search pull requests in a specific repository
const prs = await searchPullRequests({
  options: {
    owner: 'facebook',
    repo: 'react',
    states: ['open'],
    labels: ['bug', 'enhancement'],
    author: 'saarshe',
    useCache: true
  }
});

// Clear cache when needed
await clearAllCache();
```

## Development

### Setup

```bash
# Development mode (watches for changes)
yarn dev

# Type checking
yarn type-check

# Clean all build outputs
yarn clean

# Run tests
yarn test
```

### Working with specific packages

```bash
# Work on core package
cd packages/core
yarn dev

# Work on alfred package
cd packages/alfred
yarn dev
```

## Roadmap

### ✅ Completed
- ✅ GitHub repository search with organization filtering
- ✅ Pull request search with advanced filtering
- ✅ GitHub CLI authentication integration
- ✅ TypeScript API with comprehensive types
- ✅ Test coverage and validation
- ✅ Intelligent caching system with TTL support

### 🚧 In Progress
- 🚧 Alfred workflow integration

### 📋 Planned
- 📋 CLI tool
- 📋 Browser extensions
- 📋 VS Code extension
- 📋 Additional authentication methods (personal tokens, OAuth)

## License

MIT
