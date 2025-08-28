# Caching System

The Pullke core package includes a robust caching mechanism. This system provides TTL-based caching for GitHub API calls to improve performance and reduce API rate limiting.

## Features

- **TTL-based caching**: Cache entries expire after a configurable time period (default: 7 days)
- **File-based storage**: Cache is persisted to disk in `~/.cache/pullke/`
- **Automatic cache management**: Invalid or expired entries are automatically ignored
- **Cache key generation**: Deterministic keys based on search parameters
- **Error resilience**: Cache failures don't break the application flow

## Basic Usage

### Repository Search with Caching

```typescript
import { searchRepositories } from '@pullke/core';

// Search with caching enabled (default)
const result = await searchRepositories({
  organizations: ['microsoft', 'google'],
  keywords: 'typescript,react',
  useCache: true,       // Enable caching (default: true)
  cacheTtl: 3600,       // Cache for 1 hour (default: 7 days)
});

console.log(`Found ${result.items.length} repositories`);
console.log(`From cache: ${result.cached}`);
```

### Pull Request Search with Caching

```typescript
import { searchPullRequests } from '@pullke/core';

const result = await searchPullRequests({
  options: {
    owner: 'microsoft',
    repo: 'typescript',
    states: ['open'],
    useCache: true,
    cacheTtl: 1800,     // Cache for 30 minutes
  }
});
```

### Disable Caching

```typescript
// Skip cache and always fetch fresh data
const result = await searchRepositories({
  organizations: ['microsoft'],
  keywords: 'typescript',
  useCache: false,
});
```

## Cache Management

### Clear All Cache

```typescript
import { clearAllCache } from '@pullke/core';

const result = await clearAllCache();
console.log(`Removed ${result.removed} files, ${result.errors} errors`);
```

### Get Cache Information

```typescript
import { getCacheInfo } from '@pullke/core';

const info = await getCacheInfo();

console.log(`Cache directory: ${info.cacheDir}`);
console.log(`Files: ${info.files}`);
console.log(`Total size: ${(info.totalSize / 1024).toFixed(2)} KB`);
```

### Manual Cache Operations

```typescript
import { 
  setCache, 
  getCache, 
  isCacheValid, 
  removeCacheEntry,
  configureCacheSettings 
} from '@pullke/core';

// Configure cache settings (optional)
configureCacheSettings({
  cacheDir: '/custom/cache/path',
  ttl: 3600 // 1 hour default TTL
});

// Set custom data
await setCache('my-key', { data: 'custom' }, 3600); // 1 hour TTL

// Get data
const data = await getCache('my-key');

// Check if valid
const isValid = await isCacheValid('my-key');

// Remove specific entry
await removeCacheEntry('my-key');
```

## Cache Keys

Cache keys are automatically generated based on search parameters:

### Repository Search Keys
- Based on: organizations, keywords
- Example: `repos_microsoft,google_typescript,react`

### Pull Request Search Keys
- Based on: owner, repo, all search options
- Example: `prs_microsoft_typescript_states:open|author:user1`

## Configuration

### Default Settings

- **TTL**: 168 hours (7 days)
- **Cache Directory**: `~/.cache/pullke/`
- **File Format**: JSON with metadata

### Custom Cache Configuration

```typescript
import { configureCacheSettings } from '@pullke/core';

// Configure global cache settings
configureCacheSettings({
  cacheDir: '/custom/cache/path',
  ttl: 3600, // 1 hour default TTL
});
```

## Command Line Utilities

The package includes utility scripts for testing cache management:

### Test Cache Integration

```bash
# From the built package
node dist/scripts/test/test-cache-integration.js
```

## Cache Behavior

### Cache Hit
- Data is retrieved from disk
- No GitHub API call is made
- `result.cached = true`
- Significantly faster response

### Cache Miss
- Fresh data is fetched from GitHub
- Result is cached for future use
- `result.cached = false`
- Normal API response time

### Cache Expiry
- Entries older than TTL are ignored
- Fresh data is fetched automatically
- Old cache files are not automatically deleted (manual cleanup required). #coming-soon: auto-cleanup

## Error Handling

The caching system is designed to be resilient:

- Cache read/write failures don't break the application
- On cache errors, fresh data is fetched from GitHub
- Detailed error logging to stderr for debugging

## Performance Benefits

- **Cache hits**: 100-500x faster than GitHub API calls
- **Reduced API calls**: Significant reduction in rate limiting
- **Offline capability**: Works with cached data when offline

## Best Practices

1. **Use appropriate TTL**: Balance freshness vs performance
2. **Monitor cache size**: Regular cleanup for long-running applications
3. **Handle cache misses gracefully**: Always expect potential fresh data fetches
4. **Leverage cache keys**: Understand how different parameters affect caching
5. **Test with and without cache**: Ensure application works in both scenarios
