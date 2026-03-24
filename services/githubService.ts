export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  updated_at: string;
}

const getHeaders = () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
};

export const fetchRepoDetails = async (owner: string, repo: string): Promise<GitHubRepo> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch repo details: ${response.statusText}`);
  }
  
  return response.json();
};

export const fetchRecentCommits = async (owner: string, repo: string, limit: number = 10): Promise<GitHubCommit[]> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch commits: ${response.statusText}`);
  }
  
  return response.json();
};
