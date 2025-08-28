import { Repository } from '@pullke/core';
import { AlfredItem, AlfredResult, AlfredConfig } from './types.js';

/**
 * Read configuration from Alfred environment variables
 */
export function getAlfredConfig(): AlfredConfig {
  const organizations = process.env.organizations;
  const keywords = process.env.keywords;
  const cacheTtlHours = process.env.cache_ttl_hours;

  if (!organizations) {
    throw new Error('organizations environment variable is required');
  }

  return {
    organizations: organizations
      .split(',')
      .map(org => org.trim())
      .filter(Boolean),
    keywords: keywords?.trim() || undefined,
    cacheTtlHours: cacheTtlHours ? parseInt(cacheTtlHours, 10) : 168, // Default 7 days
  };
}

/**
 * Create an Alfred item from a repository
 */
export function createAlfredItem(repo: Repository): AlfredItem {
  return {
    uid: repo.full_name,
    title: repo.name,
    subtitle: buildRepoSubtitle(repo),
    arg: repo.html_url,
    valid: true,
  };
}

/**
 * Create an error Alfred item
 */
export function createErrorItem(title: string, subtitle: string): AlfredItem {
  return {
    uid: 'error',
    title,
    subtitle,
    arg: '',
    valid: false,
  };
}
/**
 * Build a descriptive subtitle for a repository
 */
function buildRepoSubtitle(repo: Repository): string {
  const subtitleParts: string[] = [];

  // Add description if available
  if (repo.description) {
    subtitleParts.push(repo.description);
  }

  // Add language and stars if available
  const extras: string[] = [];
  if (repo.language) {
    extras.push(repo.language);
  }
  if (repo.stargazers_count && repo.stargazers_count > 0) {
    extras.push(`⭐ ${repo.stargazers_count}`);
  }

  if (extras.length > 0) {
    subtitleParts.push(extras.join(' • '));
  }

  // If no description, fall back to URL
  if (subtitleParts.length === 0) {
    subtitleParts.push(repo.html_url);
  }

  return subtitleParts.join(' | ');
}

/**
 * Create Alfred JSON result
 */
export function createAlfredResult(items: AlfredItem[]): AlfredResult {
  return { items };
}

/**
 * Output Alfred JSON to stdout
 */
export function outputAlfredResult(result: AlfredResult): void {
  console.log(JSON.stringify(result));
}
