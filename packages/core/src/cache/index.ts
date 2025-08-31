import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { CacheEntry, CacheOptions } from '../types/github';

// Default cache configuration
const DEFAULT_REPO_TTL = 7 * 24 * 60 * 60; // 1 week in seconds
const DEFAULT_PR_TTL = 24 * 60 * 60; // 24 hours in seconds
const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.cache', 'pullke');

// Global cache configuration
let cacheConfig = {
  cacheDir: DEFAULT_CACHE_DIR,
  repoTtl: DEFAULT_REPO_TTL,
  prTtl: DEFAULT_PR_TTL,
};

/**
 * Configure cache settings
 */
export function configureCacheSettings(options: CacheOptions = {}): void {
  cacheConfig = {
    cacheDir: options.cacheDir || DEFAULT_CACHE_DIR,
    repoTtl: options.repoTtl || DEFAULT_REPO_TTL,
    prTtl: options.prTtl || DEFAULT_PR_TTL,
  };
}

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(cacheConfig.cacheDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create cache directory:', error);
    throw error;
  }
}

/**
 * Sanitize a cache key to be safe for file system usage
 */
export function sanitizeCacheKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Generate cache file path for a given key
 */
function getCacheFilePath(key: string): string {
  // Sanitize key to be safe for file system
  const sanitizedKey = sanitizeCacheKey(key);
  return path.join(cacheConfig.cacheDir, `${sanitizedKey}.json`);
}

/**
 * Check if a cache entry is valid (exists and within stored TTL)
 */
export async function isCacheValid(key: string): Promise<boolean> {
  try {
    const filePath = getCacheFilePath(key);
    const content = await fs.readFile(filePath, 'utf-8');
    const cacheEntry: CacheEntry<any> = JSON.parse(content);

    const age = (Date.now() - cacheEntry.timestamp) / 1000; // age in seconds
    return age < cacheEntry.ttl;
  } catch {
    return false;
  }
}

/**
 * Save data to cache with TTL
 */
export async function setCache<T>(
  key: string,
  data: T,
  customTtl?: number
): Promise<void> {
  try {
    await ensureCacheDir();
    const ttl = customTtl || getDefaultTtlForKey(key);
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    const filePath = getCacheFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2));
  } catch (error) {
    console.error(`Failed to save cache for key "${key}":`, error);
    throw error;
  }
}

/**
 * Get data from cache if valid
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const filePath = getCacheFilePath(key);
    const isValidCache = await isCacheValid(key);

    if (!isValidCache) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const cacheEntry: CacheEntry<T> = JSON.parse(content);
    return cacheEntry.data;
  } catch (error) {
    console.error(`Failed to read cache for key "${key}":`, error);
    return null;
  }
}

/**
 * Get the appropriate default TTL based on cache key type
 */
function getDefaultTtlForKey(key: string): number {
  if (key.startsWith('repos_')) {
    return cacheConfig.repoTtl;
  } else if (key.startsWith('prs_')) {
    return cacheConfig.prTtl;
  }
  // Fallback to repo TTL for unknown key types
  return cacheConfig.repoTtl;
}

/**
 * Get data from cache or fetch using the provided function
 */
export async function getFromCacheOrFetch<T>({
  key,
  fetchFn,
  customTtl,
}: {
  key: string;
  fetchFn: () => Promise<T>;
  customTtl?: number;
}): Promise<{ data: T; cached: boolean }> {
  try {
    // Try to get from cache first
    const cachedData = await getCache<T>(key);
    if (cachedData !== null) {
      console.error(`✅ Using cached data for: ${key}`);
      return { data: cachedData, cached: true };
    }

    // Cache miss or expired - fetch fresh data
    console.error(`⏰ Cache miss for "${key}", fetching fresh data...`);
    const freshData = await fetchFn();

    // Save to cache with appropriate TTL
    const ttlToUse = customTtl || getDefaultTtlForKey(key);
    await setCache(key, freshData, ttlToUse);
    console.error(`✅ Cached fresh data for: ${key} (TTL: ${ttlToUse}s)`);

    return { data: freshData, cached: false };
  } catch (error) {
    console.error(`Cache operation failed for key "${key}":`, error);
    // If cache operations fail, still try to fetch fresh data
    const freshData = await fetchFn();
    return { data: freshData, cached: false };
  }
}

/**
 * Remove a specific cache entry
 */
export async function removeCacheEntry(key: string): Promise<boolean> {
  try {
    const filePath = getCacheFilePath(key);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Failed to remove cache for key "${key}":`, error);
    return false;
  }
}

/**
 * Get cache directory info
 */
export async function getCacheInfo(): Promise<{
  cacheDir: string;
  files: number;
  totalSize: number;
}> {
  try {
    const files = await fs.readdir(cacheConfig.cacheDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let totalSize = 0;
    for (const file of jsonFiles) {
      try {
        const stats = await fs.stat(path.join(cacheConfig.cacheDir, file));
        totalSize += stats.size;
      } catch {
        // Ignore individual file stat errors
      }
    }

    return {
      cacheDir: cacheConfig.cacheDir,
      files: jsonFiles.length,
      totalSize,
    };
  } catch {
    return {
      cacheDir: cacheConfig.cacheDir,
      files: 0,
      totalSize: 0,
    };
  }
}

/**
 * Generate a cache key for repository search
 */
export function generateRepoSearchCacheKey(
  organizations: string[],
  keywords?: string,
  includeCurrentUser?: boolean
): string {
  const orgsKey = organizations.sort().join(',');

  // Normalize keywords by splitting, trimming, filtering, and sorting
  const keywordsKey = keywords
    ? keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
        .sort()
        .join(',')
    : '';

  const userKey = includeCurrentUser ? 'user' : '';

  return `repos_${orgsKey}_${keywordsKey}_${userKey}`;
}

/**
 * Generate a cache key for pull request search
 */
export function generatePRSearchCacheKey(
  owner: string,
  repo: string,
  options: Record<string, any> = {}
): string {
  // Create a deterministic key from the search options
  const optionsString = Object.keys(options)
    .sort()
    .map(key => `${key}:${options[key]}`)
    .join('|');

  return `prs_${owner}_${repo}_${optionsString}`;
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<{
  removed: number;
  errors: number;
}> {
  let removed = 0;
  let errors = 0;

  try {
    const files = await fs.readdir(cacheConfig.cacheDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    for (const file of jsonFiles) {
      // Convert filename back to cache key by removing .json extension
      const cacheKey = file.replace('.json', '');
      const success = await removeCacheEntry(cacheKey);

      if (success) {
        removed++;
      } else {
        errors++;
      }
    }

    console.error(`Cache cleared: ${removed} files removed, ${errors} errors`);
  } catch (error) {
    console.error('Failed to clear cache directory:', error);
    return { removed: 0, errors: 1 };
  }

  return { removed, errors };
}
