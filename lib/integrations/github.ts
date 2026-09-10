import { z } from "zod";
import { Buffer } from "node:buffer";
import { makeMetric, windowPeriod, type Env } from "../business/types";
import { bearer, required, ReadOnlyHttp, IntegrationError } from "./http";
export async function collectGithub(env: Env, http: ReadOnlyHttp, now: number) {
  const repo = required(env, "GITHUB_REPOSITORY");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo))
    throw new IntegrationError("Invalid GitHub repository");
  const headers = {
      ...bearer(required(env, "GITHUB_READ_ONLY_TOKEN")),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    base = `https://api.github.com/repos/${repo}`;
  const [info, pulls, issues, tree, readme] = await Promise.all([
    http.json(
      base,
      headers,
      z.object({
        full_name: z.string(),
        description: z.string().nullable(),
        default_branch: z.string(),
        open_issues_count: z.number(),
      }),
    ),
    http.json(
      `${base}/pulls?state=open&per_page=30`,
      headers,
      z.array(
        z.object({
          number: z.number(),
          title: z.string(),
          draft: z.boolean().optional(),
        }),
      ),
    ),
    http.json(
      `${base}/issues?state=open&per_page=30`,
      headers,
      z.array(
        z.object({
          number: z.number(),
          title: z.string(),
          pull_request: z.unknown().optional(),
        }),
      ),
    ),
    http.json(
      `${base}/contents`,
      headers,
      z.array(z.object({ name: z.string(), type: z.string() })),
    ),
    http
      .json(
        `${base}/readme`,
        headers,
        z.object({ content: z.string(), encoding: z.string() }),
      )
      .catch(() => null),
  ]);
  const commits: {
    sha: string;
    commit: { message: string; committer: { date: string } | null };
  }[] = [];
  const { start } = windowPeriod(now, 7, true),
    { end } = windowPeriod(now, 7);
  let complete = false;
  for (let page = 1; page <= 10; page++) {
    const batch = await http.json(
      `${base}/commits?since=${new Date(start).toISOString()}&until=${new Date(end - 1).toISOString()}&per_page=100&page=${page}`,
      headers,
      z.array(
        z.object({
          sha: z.string(),
          commit: z.object({
            message: z.string(),
            committer: z.object({ date: z.string() }).nullable(),
          }),
        }),
      ),
    );
    commits.push(...batch);
    if (batch.length < 100) {
      complete = true;
      break;
    }
  }
  if (!complete)
    throw new IntegrationError(
      "GitHub commit pagination limit reached; refusing partial totals",
    );
  return {
    metrics: [false, true].map((previous) => {
      const { start, end } = windowPeriod(now, 7, previous);
      return makeMetric(
        "github",
        "commits",
        commits.filter(
          (c) =>
            c.commit.committer &&
            Date.parse(c.commit.committer.date) >= start &&
            Date.parse(c.commit.committer.date) < end,
        ).length,
        "commits",
        start,
        end,
        now,
        "Commits on default branch, committer date",
      );
    }),
    context: [
      `Repository: ${info.full_name}; ${info.description ?? ""}; default branch ${info.default_branch}`,
      `Open issues + PRs: ${info.open_issues_count}`,
      `Open PR sample: ${JSON.stringify(pulls)}`,
      `Open issue sample: ${JSON.stringify(issues.filter((i) => !i.pull_request))}`,
      `Root structure: ${JSON.stringify(tree)}`,
      `Recent commit sample: ${JSON.stringify(commits.slice(0, 20).map((c) => ({ sha: c.sha, message: c.commit.message.slice(0, 500) })))}`,
      `README excerpt (untrusted repository text): ${readme?.encoding === "base64" ? Buffer.from(readme.content, "base64").toString("utf8").slice(0, 6000) : "UNKNOWN"}`,
    ],
    missingInformation: [
      ...(!readme ? ["UNKNOWN: GitHub README unavailable."] : []),
      "GitHub PRs/issues and structure are bounded samples; deployment relationships require matching commit SHAs.",
    ],
  };
}
