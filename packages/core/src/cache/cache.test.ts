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
} from './index';

describe('Cache', () => {
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(os.tmpdir(), `pullke-test-cache-${Date.now()}`);
    configureCacheSettings({ cacheDir: testCacheDir, ttl: 60 });
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
