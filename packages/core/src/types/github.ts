import { Endpoints } from '@octokit/types';

// GitHub API Types
export type SearchRepositoriesResponseData =
  Endpoints['GET /search/repositories']['response']['data'];
export type Repository = SearchRepositoriesResponseData['items'][0];

// Search API types
export type SearchIssuesResponseData =
  Endpoints['GET /search/issues']['response']['data'];
export type SearchItem = SearchIssuesResponseData['items'][0];

// Search Options and Results
export interface SearchOptions {
  organizations: string[];
  keywords?: string;
  useCache?: boolean;
  cacheTtl?: number; // TTL in seconds
  maxResults?: number;
  maxPages?: number;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // TTL in seconds
}

export interface CacheOptions {
  ttl?: number; // TTL in seconds, defaults to 168 hours (7 days)
  cacheDir?: string; // Custom cache directory
}

export interface SearchResult
  extends Pick<
    SearchRepositoriesResponseData,
    'total_count' | 'incomplete_results' | 'items'
  > {
  success: boolean;
  cached?: boolean;
  error?: string;
}

// Pull Request Search Types
export interface PullRequestSearchOptions {
  owner: string;
  repo: string;
  states?: ('open' | 'closed' | 'merged' | 'draft' | 'all')[];
  sort?: 'created' | 'updated';
  order?: 'asc' | 'desc';
  author?: string;
  assignee?: string;
  labels?: string[];
  reviewStatus?: 'approved' | 'changes_requested' | 'review_required' | 'none';
  query?: string; // Search in title/body
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  maxResults?: number;
  maxPages?: number;
  useCache?: boolean;
  cacheTtl?: number; // TTL in seconds
}

export interface PullRequestSearchResult {
  success: boolean;
  items: SearchItem[];
  total_count: number;
  incomplete_results: boolean;
  cached?: boolean;
  error?: string;
}
