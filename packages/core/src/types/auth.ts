// Authentication Types
export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AuthErrorInfo {
  title: string;
  subtitle: string;
  action?: string;
}
