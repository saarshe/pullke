import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchPullRequests } from './search';
import { createOctokitClient } from '../client';
import { PullRequestSearchOptions } from '../../types/github';
import { setupCacheMocks, clearCacheMocks } from '../../__tests__/test-utils';

// Mock the client module
vi.mock('../client', () => ({
  createOctokitClient: vi.fn(),
}));

// Mock the cache module
vi.mock('../../cache/index', () => ({
  getFromCacheOrFetch: vi.fn(),
  generatePRSearchCacheKey: vi.fn(() => 'mock-pr-cache-key'),
  generateRepoSearchCacheKey: vi.fn(() => 'mock-repo-cache-key'),
}));

// Type the mocked functions
const mockCreateOctokitClient = vi.mocked(createOctokitClient);

// Mock Octokit instance
const mockOctokit = {
  rest: {
    search: {
      issuesAndPullRequests: vi.fn(),
    },
  },
};

describe('Pull Request Search Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateOctokitClient.mockResolvedValue(mockOctokit as any);
    setupCacheMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    clearCacheMocks();
  });

  describe('searchPullRequests', () => {
    const baseOptions: PullRequestSearchOptions = {
      owner: 'testowner',
      repo: 'testrepo',
    };

    it('should successfully search for pull requests with basic options', async () => {
      const mockPullRequests = [
        {
          id: 1,
          number: 123,
          title: 'Test PR',
          state: 'open',
          user: { login: 'testuser' },
          pull_request: {
            url: 'https://api.github.com/repos/testowner/testrepo/pulls/123',
          },
        },
        {
          id: 2,
          number: 124,
          title: 'Another PR',
          state: 'closed',
          user: { login: 'anotheruser' },
          pull_request: {
            url: 'https://api.github.com/repos/testowner/testrepo/pulls/124',
          },
        },
      ];

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: mockPullRequests,
          total_count: 2,
          incomplete_results: false,
        },
      });

      const result = await searchPullRequests({ options: baseOptions });

      expect(result.success).toBe(true);
      expect(result.items).toEqual(mockPullRequests);
      expect(result.total_count).toBe(2);
      expect(result.incomplete_results).toBe(false);
      expect(result.cached).toBe(false);
    });

    it('should build correct search query with basic repository filter', async () => {
      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options: baseOptions });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith({
        q: 'repo:testowner/testrepo is:pr',
        per_page: 100,
        sort: 'updated',
        order: 'desc',
        advanced_search: 'true',
      });
    });

    it('should include state filters in search query', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        states: ['open', 'merged'],
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr (is:open OR is:merged)',
        })
      );
    });

    it('should include single state filter without parentheses', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        states: ['open'],
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr is:open',
        })
      );
    });

    it('should include author filter in search query', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        author: 'testauthor',
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr author:testauthor',
        })
      );
    });

    it('should include assignee filter in search query', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        assignee: 'testassignee',
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr assignee:testassignee',
        })
      );
    });

    it('should include labels in search query', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        labels: ['bug', 'urgent fix'],
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr label:bug label:"urgent fix"',
        })
      );
    });

    it('should include date filters in search query', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr created:>=2025-01-01 created:<=2025-12-31',
        })
      );
    });

    it('should include text query in search', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        query: 'fix bug',
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr fix bug',
        })
      );
    });

    it('should handle complex search query with multiple filters', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        states: ['open', 'draft'],
        author: 'testuser',
        labels: ['feature', 'needs review'],
        dateFrom: '2025-06-01',
        query: 'authentication',
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr (is:open OR is:draft) author:testuser label:feature label:"needs review" created:>=2025-06-01 authentication',
        })
      );
    });

    it('should respect maxResults parameter', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        maxResults: 50,
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          per_page: 50,
        })
      );
    });

    it('should cap maxResults at 100', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        maxResults: 150,
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          per_page: 100,
        })
      );
    });

    it('should handle sort and order parameters', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        sort: 'created',
        order: 'asc',
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'created',
          order: 'asc',
        })
      );
    });

    it('should handle client creation failure', async () => {
      mockCreateOctokitClient.mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await searchPullRequests({ options: baseOptions });

      expect(result.success).toBe(false);
      expect(result.items).toEqual([]);
      expect(result.total_count).toBe(0);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle API search failure', async () => {
      mockOctokit.rest.search.issuesAndPullRequests.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await searchPullRequests({ options: baseOptions });

      expect(result.success).toBe(false);
      expect(result.items).toEqual([]);
      expect(result.total_count).toBe(0);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('should handle unknown error types', async () => {
      mockOctokit.rest.search.issuesAndPullRequests.mockRejectedValue(
        'String error'
      );

      const result = await searchPullRequests({ options: baseOptions });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should skip states filter when "all" is included', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        states: ['all', 'open'],
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr',
        })
      );
    });

    it('should skip states filter when array is empty', async () => {
      const options: PullRequestSearchOptions = {
        ...baseOptions,
        states: [],
      };

      mockOctokit.rest.search.issuesAndPullRequests.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchPullRequests({ options });

      expect(
        mockOctokit.rest.search.issuesAndPullRequests
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'repo:testowner/testrepo is:pr',
        })
      );
    });
  });
});
