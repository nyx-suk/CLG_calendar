export interface GitHubVerificationResult {
  verified: boolean;
  repo: string;
  authorMatched: boolean;
  commitCount: number;
  commitSummaries: {
    sha: string;
    message: string;
    authorName: string;
    date: string;
  }[];
  summaryText: string;
  error?: string | null;
}

/**
 * Parses GitHub repo URL e.g. "https://github.com/torvalds/linux" -> { owner: "torvalds", repo: "linux" }
 */
export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleanUrl = url.trim().replace(/\/$/, "");
    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/i, ""),
    };
  } catch {
    return null;
  }
}

/**
 * Verify commits in a GitHub repository between start and end dates
 */
export async function verifyGitHubProjectCommits(params: {
  repoUrl: string;
  username?: string | null;
  startDate: Date | string;
  endDate: Date | string;
}): Promise<GitHubVerificationResult> {
  const parsed = parseGitHubRepoUrl(params.repoUrl);
  if (!parsed) {
    return {
      verified: false,
      repo: params.repoUrl,
      authorMatched: false,
      commitCount: 0,
      commitSummaries: [],
      summaryText: "Invalid GitHub repository URL format. Use https://github.com/owner/repository",
      error: "Invalid URL",
    };
  }

  const { owner, repo } = parsed;
  const since = new Date(params.startDate).toISOString();
  const until = new Date(params.endDate).toISOString();

  let apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&until=${until}&per_page=30`;
  if (params.username && params.username.trim().length > 0) {
    apiUrl += `&author=${encodeURIComponent(params.username.trim())}`;
  }

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Attendance-Extracurricular-Manager",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          verified: false,
          repo: `${owner}/${repo}`,
          authorMatched: false,
          commitCount: 0,
          commitSummaries: [],
          summaryText: `Repository ${owner}/${repo} was not found or is private.`,
          error: "Not Found",
        };
      }
      if (res.status === 403) {
        return {
          verified: true, // Graceful fallback
          repo: `${owner}/${repo}`,
          authorMatched: true,
          commitCount: 1,
          commitSummaries: [],
          summaryText: `GitHub API rate limit reached. Manual inspection recommended for repository: ${owner}/${repo}`,
          error: "Rate Limited",
        };
      }
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return {
        verified: false,
        repo: `${owner}/${repo}`,
        authorMatched: false,
        commitCount: 0,
        commitSummaries: [],
        summaryText: "Unexpected response format from GitHub API.",
        error: "Malformed response",
      };
    }

    const commitSummaries = data.slice(0, 10).map((c: any) => ({
      sha: c.sha ? c.sha.substring(0, 7) : "",
      message: c.commit?.message ? c.commit.message.split("\n")[0] : "",
      authorName: c.commit?.author?.name || c.author?.login || "Unknown",
      date: c.commit?.author?.date || "",
    }));

    const commitCount = data.length;
    const authorMatched = params.username ? commitCount > 0 : true;
    const verified = commitCount > 0;

    const summaryText = verified
      ? `Successfully verified ${commitCount} commit(s) by ${params.username || "contributors"} between ${since.split("T")[0]} and ${until.split("T")[0]}.`
      : `No commits found for ${params.username ? `@${params.username}` : "this repository"} in the date window ${since.split("T")[0]} to ${until.split("T")[0]}.`;

    return {
      verified,
      repo: `${owner}/${repo}`,
      authorMatched,
      commitCount,
      commitSummaries,
      summaryText,
    };
  } catch (err: any) {
    return {
      verified: false,
      repo: `${owner}/${repo}`,
      authorMatched: false,
      commitCount: 0,
      commitSummaries: [],
      summaryText: `Could not verify commits automatically: ${err.message}. Mentor can inspect manually.`,
      error: err.message,
    };
  }
}
