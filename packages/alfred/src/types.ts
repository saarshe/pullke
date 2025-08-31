// Alfred Script Filter types
export interface AlfredItem {
  uid?: string;
  title: string;
  subtitle?: string;
  arg: string;
  valid?: boolean;
  autocomplete?: string;
  icon?: {
    type?: string;
    path?: string;
  };
  mods?: {
    [key: string]: {
      arg?: string;
      subtitle?: string;
      valid?: boolean;
    };
  };
}

export interface AlfredResult {
  items: AlfredItem[];
}

// Configuration from environment variables
export interface AlfredConfig {
  organizations: string[];
  keywords?: string;
  repoCacheTtlHours?: number;
  prCacheTtlHours?: number;
  includeUserRepos?: boolean;
}
