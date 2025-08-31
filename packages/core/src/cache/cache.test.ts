import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  configureCacheSettings,
  isCacheValid,
  setCache,
  getCache,
  getFromCacheOrFetch,
  removeCacheEntry,
  clearAllCache,
  getCacheInfo,
  generateRepoSearchCacheKey,
  generatePRSearchCacheKey,
  sanitizeCacheKey,
} from './index';

describe('Cache', () => {
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(os.tmpdir(), `pullke-test-cache-${Date.now()}`);
    configureCacheSettings({
      cacheDir: testCacheDir,
      repoTtl: 120, // 2 minutes for testing
      prTtl: 30, // 30 seconds for testing
    });
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rmdir(testCacheDir, { recursive: true });
    } catch {
      console.error(`Error cleaning up test cache directory: ${testCacheDir}`);
    }
  });

  describe('basic operations', () => {
    it('should save and retrieve data', async () => {
      const testData = { message: 'hello world', timestamp: Date.now() };

      await setCache('test-key', testData);
      const retrieved = await getCache('test-key');

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const result = await getCache('non-existent');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      const testData = { message: 'expires quickly' };

      // Set with very short TTL
      await setCache('short-ttl', testData, 0.1); // 0.1 seconds

      // Should be available immediately
      let result = await getCache('short-ttl');
      expect(result).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should be expired now
      result = await getCache('short-ttl');
      expect(result).toBeNull();
    });

    it('should validate cache correctly', async () => {
      const testData = { message: 'validation test' };

      // Before setting
      let isValid = await isCacheValid('validation-test');
      expect(isValid).toBe(false);

      // After setting
      await setCache('validation-test', testData);
      isValid = await isCacheValid('validation-test');
      expect(isValid).toBe(true);

      // After expiration
      await setCache('validation-test', testData, 0.1);
      await new Promise(resolve => setTimeout(resolve, 200));
      isValid = await isCacheValid('validation-test');
      expect(isValid).toBe(false);
    });
  });

  describe('getOrFetch', () => {
    it('should fetch and cache on cache miss', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ data: 'fetched' }));

      const result = await getFromCacheOrFetch({
        key: 'fetch-test',
        fetchFn: fetchMock,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ data: 'fetched' });
      expect(result.cached).toBe(false);
    });

    it('should return cached data on cache hit', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ data: 'fetched' }));

      // First call - cache miss
      await getFromCacheOrFetch({
        key: 'fetch-test-2',
        fetchFn: fetchMock,
      });

      // Second call - cache hit
      const result = await getFromCacheOrFetch({
        key: 'fetch-test-2',
        fetchFn: fetchMock,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1); // Should not be called again
      expect(result.data).toEqual({ data: 'fetched' });
      expect(result.cached).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should remove specific cache entry', async () => {
      await setCache('remove-test', { data: 'to be removed' });

      let result = await getCache('remove-test');
      expect(result).not.toBeNull();

      const removed = await removeCacheEntry('remove-test');
      expect(removed).toBe(true);

      result = await getCache('remove-test');
      expect(result).toBeNull();
    });

    it('should clear all cache entries', async () => {
      await setCache('clear-test-1', { data: 'test1' });
      await setCache('clear-test-2', { data: 'test2' });

      const clearResult = await clearAllCache();
      expect(clearResult.removed).toBe(2);
      expect(clearResult.errors).toBe(0);

      const result1 = await getCache('clear-test-1');
      const result2 = await getCache('clear-test-2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should get cache info', async () => {
      await setCache('info-test-1', { data: 'test1' });
      await setCache('info-test-2', { data: 'test2' });

      const info = await getCacheInfo();

      expect(info.cacheDir).toBe(testCacheDir);
      expect(info.files).toBe(2);
      expect(info.totalSize).toBeGreaterThan(0);
    });
  });

  describe('separate TTL functionality', () => {
    it('should use repo TTL for repository cache keys', async () => {
      const repoKey = generateRepoSearchCacheKey(['org1'], 'test');
      const testData = { repos: ['repo1', 'repo2'] };

      await setCache(repoKey, testData);

      // Read the cache file directly to verify TTL
      const cacheFilePath = path.join(
        testCacheDir,
        `${sanitizeCacheKey(repoKey)}.json`
      );
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      const cacheEntry = JSON.parse(content);

      expect(cacheEntry.ttl).toBe(120); // Should use repo TTL (from test config)
    });

    it('should use PR TTL for pull request cache keys', async () => {
      const prKey = generatePRSearchCacheKey('owner', 'repo', {
        states: ['open'],
      });
      const testData = { prs: ['pr1', 'pr2'] };

      await setCache(prKey, testData);

      // Read the cache file directly to verify TTL
      const cacheFilePath = path.join(
        testCacheDir,
        `${sanitizeCacheKey(prKey)}.json`
      );
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      const cacheEntry = JSON.parse(content);

      expect(cacheEntry.ttl).toBe(30); // Should use PR TTL (from test config)
    });

    it('should use custom TTL when provided', async () => {
      const customTtl = 300; // 5 minutes
      const repoKey = generateRepoSearchCacheKey(['org1'], 'test');
      const testData = { repos: ['repo1'] };

      await setCache(repoKey, testData, customTtl);

      // Read the cache file directly to verify TTL
      const cacheFilePath = path.join(
        testCacheDir,
        `${sanitizeCacheKey(repoKey)}.json`
      );
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      const cacheEntry = JSON.parse(content);

      expect(cacheEntry.ttl).toBe(customTtl); // Should use custom TTL, not default repo TTL
    });

    it('should use appropriate TTL in getFromCacheOrFetch', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ data: 'fetched' }));

      // Test with repo key
      const repoKey = generateRepoSearchCacheKey(['org1'], 'test');
      await getFromCacheOrFetch({
        key: repoKey,
        fetchFn: fetchMock,
      });

      // Test with PR key
      const prKey = generatePRSearchCacheKey('owner', 'repo', {
        states: ['open'],
      });
      await getFromCacheOrFetch({
        key: prKey,
        fetchFn: fetchMock,
      });

      // Verify both cache entries have correct TTLs
      const repoCacheFilePath = path.join(
        testCacheDir,
        `${sanitizeCacheKey(repoKey)}.json`
      );
      const repoContent = await fs.readFile(repoCacheFilePath, 'utf-8');
      const repoCacheEntry = JSON.parse(repoContent);

      const prCacheFilePath = path.join(
        testCacheDir,
        `${sanitizeCacheKey(prKey)}.json`
      );
      const prContent = await fs.readFile(prCacheFilePath, 'utf-8');
      const prCacheEntry = JSON.parse(prContent);

      expect(repoCacheEntry.ttl).toBe(120); // Repo TTL (from test config)
      expect(prCacheEntry.ttl).toBe(30); // PR TTL (from test config)
    });

    it('should use repo TTL as fallback for unknown key types', async () => {
      // Test with a key that doesn't start with 'repos_' or 'prs_'
      const genericKey = 'generic_key';
      const testData = { data: 'test' };

      await setCache(genericKey, testData);

      const cacheFilePath = path.join(testCacheDir, `${genericKey}.json`);
      const content = await fs.readFile(cacheFilePath, 'utf-8');
      const cacheEntry = JSON.parse(content);

      expect(cacheEntry.ttl).toBe(120); // Should use repo TTL as fallback (from test config)
    });
  });
});

describe('Cache key generation', () => {
  it('should generate consistent repo search cache keys', () => {
    const key1 = generateRepoSearchCacheKey(
      ['org1', 'org2'],
      'keyword1,keyword2'
    );
    const key2 = generateRepoSearchCacheKey(
      ['org2', 'org1'],
      'keyword1,keyword2'
    ); // Different order
    const key3 = generateRepoSearchCacheKey(
      ['org1', 'org2'],
      'keyword2,keyword1'
    ); // Different keywords order
    const key4 = generateRepoSearchCacheKey(
      ['org3', 'org4'],
      'keyword3,keyword4'
    ); // Different orgs

    expect(key1).toBe(key2); // Should be same due to sorting orgs
    expect(key1).toBe(key3); // Should be same due to sorting keywords
    expect(key1).not.toBe(key4); // Should be different due to different orgs
  });

  it('should normalize keywords (trim, filter, sort)', () => {
    const key1 = generateRepoSearchCacheKey(['org'], 'react,typescript,vue');
    const key2 = generateRepoSearchCacheKey(['org'], 'vue, react , typescript');
    const key3 = generateRepoSearchCacheKey(
      ['org'],
      ' typescript,, react, vue, '
    );

    expect(key1).toBe(key2); // Should be same due to sorting keywords
    expect(key1).toBe(key3); // Should be same due to sorting keywords
  });

  it('should generate consistent PR search cache keys', () => {
    const options1 = { states: ['open'], author: 'user1' };
    const options2 = { author: 'user1', states: ['open'] }; // Different order

    const key1 = generatePRSearchCacheKey('owner', 'repo', options1);
    const key2 = generatePRSearchCacheKey('owner', 'repo', options2);

    expect(key1).toBe(key2); // Should be same due to sorting options
  });

  it('should handle empty/undefined options in cache keys', () => {
    const key1 = generateRepoSearchCacheKey(['org1']);
    const key2 = generateRepoSearchCacheKey(['org1'], '');
    const key3 = generateRepoSearchCacheKey(['org1'], undefined);

    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
  });
});
