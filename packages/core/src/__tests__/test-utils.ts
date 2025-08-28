import { vi } from 'vitest';
import {
  getFromCacheOrFetch,
  generatePRSearchCacheKey,
  generateRepoSearchCacheKey,
} from '../cache/index';

/**
 * Sets up cache mocks to always return cache miss (fresh data)
 * This ensures tests get predictable behavior and mocked API calls are made
 *
 * Note: This function expects the cache module to already be mocked via vi.mock()
 */
export function setupCacheMocks(): void {
  vi.mocked(getFromCacheOrFetch).mockImplementation(async ({ fetchFn }) => {
    const data = await fetchFn();
    return {
      data,
      cached: false,
    };
  });
  vi.mocked(generatePRSearchCacheKey).mockReturnValue('mock-pr-cache-key');
  vi.mocked(generateRepoSearchCacheKey).mockReturnValue('mock-repo-cache-key');
}

/**
 * Clears all cache mocks
 */
export function clearCacheMocks(): void {
  vi.mocked(getFromCacheOrFetch).mockClear();
  vi.mocked(generatePRSearchCacheKey).mockClear();
  vi.mocked(generateRepoSearchCacheKey).mockClear();
}
