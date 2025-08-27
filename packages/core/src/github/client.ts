import { Octokit } from '@octokit/rest';
import { getGitHubToken } from '../auth/index';

/**
 * Creates an authenticated Octokit client instance
 * Shared across all GitHub API functionality
 */
export async function createOctokitClient(): Promise<Octokit> {
  const authResult = await getGitHubToken();

  if (!authResult.success || !authResult.token) {
    throw new Error('GitHub authentication failed');
  }

  return new Octokit({
    auth: authResult.token,
    userAgent: 'pullke-core/1.0.0',
  });
}
