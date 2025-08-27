import { execSync } from 'child_process';
import { AuthResult, AuthErrorInfo } from '../types/auth';

let cachedToken: string | null = null;

export async function getGitHubToken(): Promise<AuthResult> {
  if (cachedToken) {
    return {
      success: true,
      token: cachedToken,
    };
  }

  try {
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      timeout: 10000,
    }).trim();

    if (!token) {
      return {
        success: false,
        error: 'GitHub CLI returned empty token',
      };
    }

    cachedToken = token;

    return {
      success: true,
      token,
    };
  } catch (error) {
    return {
      success: false,
      error: 'GitHub CLI authentication failed',
    };
  }
}

export function clearGitHubTokenCache(): void {
  cachedToken = null;
}

export function getGitHubAuthErrorInfo(): AuthErrorInfo {
  return {
    title: 'GitHub CLI authentication required',
    subtitle: 'Install GitHub CLI and run: gh auth login',
    action: 'gh auth login',
  };
}

export async function testGitHubAuthentication(): Promise<boolean> {
  const authResult = await getGitHubToken();
  if (!authResult.success || !authResult.token) {
    return false;
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${authResult.token}`,
        'User-Agent': 'pullke-core',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
