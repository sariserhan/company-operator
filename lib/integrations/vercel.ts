import { z } from "zod";
import { makeMetric, windowPeriod, type Env } from "../business/types";
import { bearer, required, ReadOnlyHttp, IntegrationError } from "./http";
const deployment = z.object({
  uid: z.string(),
  name: z.string(),
  created: z.number(),
  state: z.string(),
  target: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export async function collectVercel(env: Env, http: ReadOnlyHttp, now: number) {
  const params = new URLSearchParams({
    projectId: required(env, "VERCEL_PROJECT_ID"),
    limit: "100",
  });
  if (env.VERCEL_TEAM_ID) params.set("teamId", env.VERCEL_TEAM_ID);
  const headers = bearer(required(env, "VERCEL_READ_ONLY_TOKEN"));
  const production = await http.json(
    `https://api.vercel.com/v6/deployments?${params}&target=production&state=READY`,
    headers,
    z.object({ deployments: z.array(deployment) }),
  );
  const { start } = windowPeriod(now, 7, true),
    { end } = windowPeriod(now, 7);
  params.set("since", String(start));
  params.set("until", String(end - 1));
  const deployments: z.infer<typeof deployment>[] = [];
  let complete = false;
  for (let page = 0; page < 20; page++) {
    const result = await http.json(
      `https://api.vercel.com/v6/deployments?${params}`,
      headers,
      z.object({
        deployments: z.array(deployment),
        pagination: z.object({ next: z.number().nullable() }).optional(),
      }),
    );
    deployments.push(...result.deployments);
    if (!result.pagination?.next) {
      complete = true;
      break;
    }
    params.set("until", String(result.pagination.next));
  }
  if (!complete)
    throw new IntegrationError(
      "Vercel pagination limit reached; refusing partial deployment totals",
    );
  const unique = [...new Map(deployments.map((d) => [d.uid, d])).values()];
  return {
    metrics: [false, true].flatMap((previous) => {
      const { start, end } = windowPeriod(now, 7, previous);
      const rows = unique.filter((d) => d.created >= start && d.created < end);
      return [
        makeMetric(
          "vercel",
          "deployments",
          rows.length,
          "deployments",
          start,
          end,
          now,
          "Production and preview deployments",
        ),
        makeMetric(
          "vercel",
          "failed_deployments",
          rows.filter((d) => d.state === "ERROR").length,
          "deployments",
          start,
          end,
          now,
          "Deployments with ERROR state",
        ),
      ];
    }),
    context: [
      `Latest ready production deployment: ${JSON.stringify(production.deployments.slice(0, 1).map((d) => ({ id: d.uid, created: d.created, state: d.state, commit: d.meta?.githubCommitSha ?? null })))}`,
      `Recent deployments: ${JSON.stringify(unique.slice(0, 20).map((d) => ({ id: d.uid, created: d.created, state: d.state, target: d.target ?? null, commit: d.meta?.githubCommitSha ?? null })))}`,
    ],
    missingInformation: production.deployments.length
      ? []
      : ["UNKNOWN: no ready production deployment found."],
  };
}
