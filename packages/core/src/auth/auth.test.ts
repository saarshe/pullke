import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock child_process at the top level
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Import after mocking
import {
  getGitHubToken,
  clearGitHubTokenCache,
  getGitHubAuthErrorInfo,
  testGitHubAuthentication,
} from '../index';
import { execSync } from 'child_process';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Type the mocked execSync
const mockExecSync = vi.mocked(execSync);

describe('GitHub Auth Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGitHubTokenCache();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getGitHubToken', () => {
    it('should return cached token on subsequent calls', async () => {
      const mockToken = 'gho_cached123';
      mockExecSync.mockReturnValue(mockToken);

      // First call
      const result1 = await getGitHubToken();
      expect(result1.success).toBe(true);
      expect(result1.token).toBe(mockToken);

      // Second call should use cache
      vi.clearAllMocks();
      const result2 = await getGitHubToken();
      expect(result2.success).toBe(true);
      expect(result2.token).toBe(mockToken);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should get token from GitHub CLI when available', async () => {
      const mockToken = 'gho_cli123456';
      mockExecSync.mockReturnValue(mockToken);

      const result = await getGitHubToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(mockExecSync).toHaveBeenCalledWith('gh auth token', {
        encoding: 'utf8',
        timeout: 10000,
      });
    });

    it('should handle empty token response', async () => {
      mockExecSync.mockReturnValue('');

      const result = await getGitHubToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub CLI returned empty token');
    });

    it('should handle GitHub CLI command failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await getGitHubToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub CLI authentication failed');
    });

    it('should trim whitespace from token', async () => {
      const mockToken = 'gho_test123456';
      mockExecSync.mockReturnValue(`  ${mockToken}  \n`);

      const result = await getGitHubToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
    });
  });

  describe('clearGitHubTokenCache', () => {
    it('should clear cached token and force re-authentication', async () => {
      const token1 = 'gho_first123456';
      const token2 = 'gho_second123456';

      // Set up first token
      mockExecSync.mockReturnValue(token1);
      const result1 = await getGitHubToken();
      expect(result1.token).toBe(token1);

      // Clear cache
      clearGitHubTokenCache();

      // Set up second token
      vi.clearAllMocks();
      mockExecSync.mockReturnValue(token2);
      const result2 = await getGitHubToken();
      expect(result2.token).toBe(token2);
      expect(mockExecSync).toHaveBeenCalledTimes(1); // Should fetch again
    });
  });

  describe('testGitHubAuthentication', () => {
    it('should return true for valid token', async () => {
      const mockToken = 'gho_valid123456';
      mockExecSync.mockReturnValue(mockToken);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      });

      const result = await testGitHubAuthentication();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          Authorization: `token ${mockToken}`,
          'User-Agent': 'pullke-core',
        },
      });
    });

    it('should return false for invalid token', async () => {
      const mockToken = 'gho_invalid123456';
      mockExecSync.mockReturnValue(mockToken);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await testGitHubAuthentication();

      expect(result).toBe(false);
    });

    it('should return false when no token available', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('No CLI');
      });

      const result = await testGitHubAuthentication();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return false when fetch throws', async () => {
      const mockToken = 'gho_test123456';
      mockExecSync.mockReturnValue(mockToken);

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await testGitHubAuthentication();

      expect(result).toBe(false);
    });

    it('should use cached token for authentication test', async () => {
      const mockToken = 'gho_cached123456';
      mockExecSync.mockReturnValue(mockToken);

      // First call to cache the token
      await getGitHubToken();

      mockFetch.mockResolvedValue({ ok: true });
      vi.clearAllMocks();

      // Test authentication should use cached token
      const result = await testGitHubAuthentication();

      expect(result).toBe(true);
      expect(mockExecSync).not.toHaveBeenCalled(); // Should not call CLI again
      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          Authorization: `token ${mockToken}`,
          'User-Agent': 'pullke-core',
        },
      });
    });
  });
});
