import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchRepositories } from './search';
import { createOctokitClient } from '../client';
import { SearchOptions } from '../../types/github';
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
      repos: vi.fn(),
    },
  },
};

describe('Repository Search Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateOctokitClient.mockResolvedValue(mockOctokit as any);
    setupCacheMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    clearCacheMocks();
  });

  describe('searchRepositories', () => {
    const baseOptions: SearchOptions = {
      organizations: ['testorg'],
    };

    it('should successfully search for repositories with basic options', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'test-repo-1',
          full_name: 'testorg/test-repo-1',
          description: 'Test repository 1',
          private: false,
          html_url: 'https://github.com/testorg/test-repo-1',
          stargazers_count: 10,
          forks_count: 5,
          updated_at: '2025-12-01T10:00:00Z',
        },
        {
          id: 2,
          name: 'test-repo-2',
          full_name: 'testorg/test-repo-2',
          description: 'Test repository 2',
          private: false,
          html_url: 'https://github.com/testorg/test-repo-2',
          stargazers_count: 20,
          forks_count: 8,
          updated_at: '2025-12-02T10:00:00Z',
        },
      ];

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: mockRepos,
          total_count: 2,
          incomplete_results: false,
        },
      });

      const result = await searchRepositories(baseOptions);

      expect(result.success).toBe(true);
      expect(result.items).toEqual(mockRepos);
      expect(result.total_count).toBe(2);
      expect(result.incomplete_results).toBe(false);
      expect(result.cached).toBe(false);
    });

    it('should search repositories in single organization without keywords', async () => {
      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchRepositories(baseOptions);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'org:testorg',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 1,
      });
    });

    it('should search repositories in multiple organizations', async () => {
      const options: SearchOptions = {
        organizations: ['org1', 'org2'],
      };

      mockOctokit.rest.search.repos
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 1,
                name: 'repo1',
                full_name: 'org1/repo1',
                description: 'Repo from org1',
                private: false,
                html_url: 'https://github.com/org1/repo1',
                stargazers_count: 5,
                forks_count: 2,
                updated_at: '2025-12-01T10:00:00Z',
              },
            ],
            total_count: 1,
            incomplete_results: false,
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 2,
                name: 'repo2',
                full_name: 'org2/repo2',
                description: 'Repo from org2',
                private: false,
                html_url: 'https://github.com/org2/repo2',
                stargazers_count: 8,
                forks_count: 3,
                updated_at: '2025-12-02T10:00:00Z',
              },
            ],
            total_count: 1,
            incomplete_results: false,
          },
        });

      const result = await searchRepositories(options);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].full_name).toBe('org1/repo1');
      expect(result.items[1].full_name).toBe('org2/repo2');
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(2);
    });

    it('should include keywords in search query', async () => {
      const options: SearchOptions = {
        organizations: ['testorg'],
        keywords: 'react, typescript',
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchRepositories(options);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'org:testorg (react OR typescript)',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 1,
      });
    });

    it('should handle single keyword without parentheses', async () => {
      const options: SearchOptions = {
        organizations: ['testorg'],
        keywords: 'react',
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchRepositories(options);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'org:testorg (react)',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 1,
      });
    });

    it('should handle keywords with extra spaces and empty values', async () => {
      const options: SearchOptions = {
        organizations: ['testorg'],
        keywords: ' react , , typescript , ',
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchRepositories(options);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'org:testorg (react OR typescript)',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 1,
      });
    });

    it('should ignore empty keywords string', async () => {
      const options: SearchOptions = {
        organizations: ['testorg'],
        keywords: '   ',
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          items: [],
          total_count: 0,
          incomplete_results: false,
        },
      });

      await searchRepositories(options);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'org:testorg',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 1,
      });
    });

    it('should handle pagination with multiple pages', async () => {
      const repos1 = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `testorg/repo-${i + 1}`,
        description: `Repository ${i + 1}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 1}`,
        stargazers_count: i,
        forks_count: Math.floor(i / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      const repos2 = Array.from({ length: 50 }, (_, i) => ({
        id: i + 101,
        name: `repo-${i + 101}`,
        full_name: `testorg/repo-${i + 101}`,
        description: `Repository ${i + 101}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 101}`,
        stargazers_count: i + 100,
        forks_count: Math.floor((i + 100) / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      mockOctokit.rest.search.repos
        .mockResolvedValueOnce({
          data: { items: repos1, total_count: 150, incomplete_results: false },
        })
        .mockResolvedValueOnce({
          data: { items: repos2, total_count: 150, incomplete_results: false },
        });

      const result = await searchRepositories(baseOptions);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(150);
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.search.repos).toHaveBeenNthCalledWith(1, {
        q: 'org:testorg',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 1,
      });
      expect(mockOctokit.rest.search.repos).toHaveBeenNthCalledWith(2, {
        q: 'org:testorg',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page: 2,
      });
    });

    it('should respect maxPages parameter', async () => {
      const options: SearchOptions = {
        organizations: ['testorg'],
        maxPages: 2,
      };

      const repos = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `testorg/repo-${i + 1}`,
        description: `Repository ${i + 1}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 1}`,
        stargazers_count: i,
        forks_count: Math.floor(i / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: { items: repos, total_count: 1000, incomplete_results: false },
      });

      await searchRepositories(options);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(2);
    });

    it('should respect maxResults parameter', async () => {
      const options: SearchOptions = {
        organizations: ['testorg'],
        maxResults: 150,
      };

      const repos1 = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `testorg/repo-${i + 1}`,
        description: `Repository ${i + 1}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 1}`,
        stargazers_count: i,
        forks_count: Math.floor(i / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      const repos2 = Array.from({ length: 100 }, (_, i) => ({
        id: i + 101,
        name: `repo-${i + 101}`,
        full_name: `testorg/repo-${i + 101}`,
        description: `Repository ${i + 101}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 101}`,
        stargazers_count: i + 100,
        forks_count: Math.floor((i + 100) / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      mockOctokit.rest.search.repos
        .mockResolvedValueOnce({
          data: { items: repos1, total_count: 1000, incomplete_results: false },
        })
        .mockResolvedValueOnce({
          data: {
            items: repos2.slice(0, 50),
            total_count: 1000,
            incomplete_results: false,
          },
        });

      const result = await searchRepositories(options);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(150);
    });

    it('should remove duplicate repositories by full_name', async () => {
      const options: SearchOptions = {
        organizations: ['org1', 'org2'],
      };

      const duplicateRepo = {
        id: 1,
        name: 'shared-repo',
        full_name: 'org1/shared-repo',
        description: 'Shared repository',
        private: false,
        html_url: 'https://github.com/org1/shared-repo',
        stargazers_count: 10,
        forks_count: 5,
        updated_at: '2025-12-01T10:00:00Z',
      };

      mockOctokit.rest.search.repos
        .mockResolvedValueOnce({
          data: {
            items: [duplicateRepo],
            total_count: 1,
            incomplete_results: false,
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [duplicateRepo],
            total_count: 1,
            incomplete_results: false,
          },
        });

      const result = await searchRepositories(options);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].full_name).toBe('org1/shared-repo');
    });

    it('should handle client creation failure', async () => {
      mockCreateOctokitClient.mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await searchRepositories(baseOptions);

      expect(result.success).toBe(false);
      expect(result.items).toEqual([]);
      expect(result.total_count).toBe(0);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle API search failure in one organization and continue with others', async () => {
      const options: SearchOptions = {
        organizations: ['org1', 'org2'],
      };

      const successRepo = {
        id: 2,
        name: 'success-repo',
        full_name: 'org2/success-repo',
        description: 'Successful repo',
        private: false,
        html_url: 'https://github.com/org2/success-repo',
        stargazers_count: 15,
        forks_count: 7,
        updated_at: '2025-12-02T10:00:00Z',
      };

      mockOctokit.rest.search.repos
        .mockRejectedValueOnce(new Error('API error for org1'))
        .mockResolvedValueOnce({
          data: {
            items: [successRepo],
            total_count: 1,
            incomplete_results: false,
          },
        });

      const result = await searchRepositories(options);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].full_name).toBe('org2/success-repo');
    });

    it('should handle complete search failure', async () => {
      mockCreateOctokitClient.mockRejectedValue(
        new Error('Complete API failure')
      );

      const result = await searchRepositories(baseOptions);

      expect(result.success).toBe(false);
      expect(result.items).toEqual([]);
      expect(result.total_count).toBe(0);
      expect(result.error).toBe('Complete API failure');
    });

    it('should handle unknown error types', async () => {
      mockCreateOctokitClient.mockRejectedValue('String error');

      const result = await searchRepositories(baseOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should stop pagination when fewer results than per_page are returned', async () => {
      const repos = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `testorg/repo-${i + 1}`,
        description: `Repository ${i + 1}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 1}`,
        stargazers_count: i,
        forks_count: Math.floor(i / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: { items: repos, total_count: 50, incomplete_results: false },
      });

      const result = await searchRepositories(baseOptions);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(50);
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(1);
    });

    it('should use default maxPages of 10 when not specified', async () => {
      const repos = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `testorg/repo-${i + 1}`,
        description: `Repository ${i + 1}`,
        private: false,
        html_url: `https://github.com/testorg/repo-${i + 1}`,
        stargazers_count: i,
        forks_count: Math.floor(i / 2),
        updated_at: '2025-12-01T10:00:00Z',
      }));

      // Mock 11 pages worth of results to test the limit
      mockOctokit.rest.search.repos.mockResolvedValue({
        data: { items: repos, total_count: 1100, incomplete_results: false },
      });

      await searchRepositories(baseOptions);

      // Should stop at 10 pages
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(10);
    });

    describe('User Repositories', () => {
      it('should search user repositories without filtering by keywords when includeCurrentUser is true', async () => {
        const options: SearchOptions = {
          organizations: ['testorg'],
          keywords: 'react, typescript',
          includeCurrentUser: true,
        };

        const orgRepos = [
          {
            id: 1,
            name: 'org-repo-react',
            full_name: 'testorg/org-repo-react',
            description: 'Organization repository',
            private: false,
            html_url: 'https://github.com/testorg/org-repo-react',
            stargazers_count: 10,
            forks_count: 5,
            updated_at: '2025-12-01T10:00:00Z',
          },
        ];

        const userRepos = [
          {
            id: 2,
            name: 'user-repo',
            full_name: 'currentuser/user-repo',
            description: 'User repository',
            private: false,
            html_url: 'https://github.com/currentuser/user-repo',
            stargazers_count: 5,
            forks_count: 2,
            updated_at: '2025-12-02T10:00:00Z',
          },
        ];

        mockOctokit.rest.search.repos
          .mockResolvedValueOnce({
            data: {
              items: orgRepos,
              total_count: 1,
              incomplete_results: false,
            },
          })
          .mockResolvedValueOnce({
            data: {
              items: userRepos,
              total_count: 1,
              incomplete_results: false,
            },
          });

        const result = await searchRepositories(options);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(2);
        expect(result.items[0].full_name).toBe('testorg/org-repo-react');
        expect(result.items[1].full_name).toBe('currentuser/user-repo');

        expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(2);
        expect(mockOctokit.rest.search.repos).toHaveBeenNthCalledWith(1, {
          q: 'org:testorg (react OR typescript)',
          sort: 'updated',
          order: 'desc',
          per_page: 100,
          page: 1,
        });
        expect(mockOctokit.rest.search.repos).toHaveBeenNthCalledWith(2, {
          q: 'user:@me',
          sort: 'updated',
          order: 'desc',
          per_page: 100,
          page: 1,
        });
      });

      it('should deduplicate repositories when user repos overlap with org repos', async () => {
        const options: SearchOptions = {
          organizations: ['testorg'],
          includeCurrentUser: true,
        };

        const sharedRepo = {
          id: 1,
          name: 'shared-repo',
          full_name: 'testorg/shared-repo',
          description: 'Shared repository',
          private: false,
          html_url: 'https://github.com/testorg/shared-repo',
          stargazers_count: 15,
          forks_count: 8,
          updated_at: '2025-12-01T10:00:00Z',
        };

        const uniqueUserRepo = {
          id: 2,
          name: 'user-only-repo',
          full_name: 'currentuser/user-only-repo',
          description: 'User only repository',
          private: false,
          html_url: 'https://github.com/currentuser/user-only-repo',
          stargazers_count: 3,
          forks_count: 1,
          updated_at: '2025-12-02T10:00:00Z',
        };

        // Both org and user searches return the shared repo
        mockOctokit.rest.search.repos
          .mockResolvedValueOnce({
            data: {
              items: [sharedRepo],
              total_count: 1,
              incomplete_results: false,
            },
          })
          .mockResolvedValueOnce({
            data: {
              items: [sharedRepo, uniqueUserRepo],
              total_count: 2,
              incomplete_results: false,
            },
          });

        const result = await searchRepositories(options);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(2);
        expect(result.items.map(r => r.full_name)).toEqual([
          'testorg/shared-repo',
          'currentuser/user-only-repo',
        ]);
      });

      it('should handle user repository search failure gracefully', async () => {
        const options: SearchOptions = {
          organizations: ['testorg'],
          includeCurrentUser: true,
        };

        const orgRepo = {
          id: 1,
          name: 'org-repo',
          full_name: 'testorg/org-repo',
          description: 'Organization repository',
          private: false,
          html_url: 'https://github.com/testorg/org-repo',
          stargazers_count: 10,
          forks_count: 5,
          updated_at: '2025-12-01T10:00:00Z',
        };

        mockOctokit.rest.search.repos
          .mockResolvedValueOnce({
            data: {
              items: [orgRepo],
              total_count: 1,
              incomplete_results: false,
            },
          })
          .mockRejectedValueOnce(new Error('User search failed'));

        const result = await searchRepositories(options);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].full_name).toBe('testorg/org-repo');
      });

      it('should not search user repositories when includeCurrentUser is false', async () => {
        const options: SearchOptions = {
          organizations: ['testorg'],
          includeCurrentUser: false,
        };

        mockOctokit.rest.search.repos.mockResolvedValue({
          data: {
            items: [],
            total_count: 0,
            incomplete_results: false,
          },
        });

        await searchRepositories(options);

        expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(1);
        expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
          q: 'org:testorg',
          sort: 'updated',
          order: 'desc',
          per_page: 100,
          page: 1,
        });
      });

      it('should handle pagination for user repositories', async () => {
        const options: SearchOptions = {
          organizations: [],
          includeCurrentUser: true,
        };

        const userRepos1 = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `user-repo-${i + 1}`,
          full_name: `currentuser/user-repo-${i + 1}`,
          description: `User repository ${i + 1}`,
          private: false,
          html_url: `https://github.com/currentuser/user-repo-${i + 1}`,
          stargazers_count: i,
          forks_count: Math.floor(i / 2),
          updated_at: '2025-12-01T10:00:00Z',
        }));

        const userRepos2 = Array.from({ length: 25 }, (_, i) => ({
          id: i + 101,
          name: `user-repo-${i + 101}`,
          full_name: `currentuser/user-repo-${i + 101}`,
          description: `User repository ${i + 101}`,
          private: false,
          html_url: `https://github.com/currentuser/user-repo-${i + 101}`,
          stargazers_count: i + 100,
          forks_count: Math.floor((i + 100) / 2),
          updated_at: '2025-12-01T10:00:00Z',
        }));

        mockOctokit.rest.search.repos
          .mockResolvedValueOnce({
            data: {
              items: userRepos1,
              total_count: 125,
              incomplete_results: false,
            },
          })
          .mockResolvedValueOnce({
            data: {
              items: userRepos2,
              total_count: 125,
              incomplete_results: false,
            },
          });

        const result = await searchRepositories(options);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(125);
        expect(mockOctokit.rest.search.repos).toHaveBeenCalledTimes(2);
        expect(mockOctokit.rest.search.repos).toHaveBeenNthCalledWith(1, {
          q: 'user:@me',
          sort: 'updated',
          order: 'desc',
          per_page: 100,
          page: 1,
        });
        expect(mockOctokit.rest.search.repos).toHaveBeenNthCalledWith(2, {
          q: 'user:@me',
          sort: 'updated',
          order: 'desc',
          per_page: 100,
          page: 2,
        });
      });
    });
  });
});
