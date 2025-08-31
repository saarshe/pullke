import { Repository, SearchItem } from '@pullke/core';
import { AlfredItem, AlfredResult, AlfredConfig } from './types.js';

/**
 * Read configuration from Alfred environment variables
 */
export function getAlfredConfig(): AlfredConfig {
  const organizations = process.env.organizations;
  const keywords = process.env.keywords;
  const repoCacheTtlHours = process.env.repo_cache_ttl_hours;
  const prCacheTtlHours = process.env.pr_cache_ttl_hours;
  const includeUserRepos = process.env.include_user_repos;

  if (!organizations) {
    throw new Error('organizations environment variable is required');
  }

  return {
    organizations: organizations
      .split(',')
      .map(org => org.trim())
      .filter(Boolean),
    keywords: keywords?.trim() || undefined,
    repoCacheTtlHours: repoCacheTtlHours
      ? parseInt(repoCacheTtlHours, 10)
      : undefined,
    prCacheTtlHours: prCacheTtlHours
      ? parseInt(prCacheTtlHours, 10)
      : undefined,
    includeUserRepos: includeUserRepos === '1' || includeUserRepos === 'true',
  };
}

/**
 * Create an Alfred item from a repository
 */
export function createRepositoryItem(repo: Repository): AlfredItem {
  return {
    uid: repo.full_name,
    title: repo.name,
    subtitle: buildRepoSubtitle(repo),
    arg: repo.full_name,
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
 * Create an Alfred item from a pull request
 */
export function createPullRequestItem(pr: SearchItem): AlfredItem {
  return {
    uid: `pr-${pr.number}`,
    title: `🔀 ${pr.title}`,
    subtitle: buildPRSubtitle(pr),
    arg: pr.html_url,
    valid: true,
  };
}

/**
 * Build a descriptive subtitle for a pull request
 */
function buildPRSubtitle(pr: SearchItem): string {
  const parts: string[] = [];

  // PR number and author
  parts.push(`#️⃣ ${pr.number} by 👤 ${pr.user?.login || 'unknown'}`);

  // State and draft status
  const status: string[] = [];
  if (pr.draft) {
    status.push('📝 draft');
  }
  if (pr.state === 'open') {
    status.push('🟢 open');
  } else if (pr.state === 'closed') {
    if (pr.pull_request?.merged_at) {
      status.push('🟣 merged');
    } else {
      status.push('🔴 closed');
    }
  }

  if (status.length > 0) {
    parts.push(status.join(', '));
  }

  // Updated time (relative)
  if (pr.updated_at) {
    const updatedDate = new Date(pr.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updatedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      parts.push('🕐 updated today');
    } else if (diffDays === 1) {
      parts.push('🕐 updated yesterday');
    } else if (diffDays < 7) {
      parts.push(`🕐 updated ${diffDays} days ago`);
    } else {
      parts.push(`🕐 updated ${Math.floor(diffDays / 7)} weeks ago`);
    }
  }

  return parts.join(' • ');
}

/**
 * Output Alfred JSON to stdout
 */
export function outputAlfredResult(result: AlfredResult): void {
  console.log(JSON.stringify(result));
}
