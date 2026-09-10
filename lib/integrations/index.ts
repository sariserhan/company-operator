import type { Env, IntegrationResult, Source } from "../business/types";
import { ReadOnlyHttp, IntegrationError, type Fetcher } from "./http";
import { collectStripe } from "./stripe";
import { collectPosthog } from "./posthog";
import { collectSearchConsole } from "./search-console";
import { collectGithub } from "./github";
import { collectVercel } from "./vercel";
export const integrationRequirements = {
  stripe: ["STRIPE_READ_ONLY_KEY"],
  posthog: [
    "POSTHOG_PERSONAL_API_KEY",
    "POSTHOG_PROJECT_ID",
    "POSTHOG_EVENT_MAP",
  ],
  search_console: ["GOOGLE_ACCESS_TOKEN", "GOOGLE_SEARCH_CONSOLE_SITE"],
  github: ["GITHUB_READ_ONLY_TOKEN", "GITHUB_REPOSITORY"],
  vercel: ["VERCEL_READ_ONLY_TOKEN", "VERCEL_PROJECT_ID"],
} as const;
export async function collectIntegrations(
  env: Env,
  currency: string,
  now = Date.now(),
  fetcher: Fetcher = fetch,
): Promise<IntegrationResult[]> {
  const collectors = {
    stripe: (h: ReadOnlyHttp) => collectStripe(env, h, now, currency),
    posthog: (h: ReadOnlyHttp) => collectPosthog(env, h, now),
    search_console: (h: ReadOnlyHttp) => collectSearchConsole(env, h, now),
    github: (h: ReadOnlyHttp) => collectGithub(env, h, now),
    vercel: (h: ReadOnlyHttp) => collectVercel(env, h, now),
  };
  return Promise.all(
    Object.entries(collectors).map(async ([name, collect]) => {
      const start = Date.now(),
        http = new ReadOnlyHttp(fetcher);
      const source = name as Source;
      try {
        return {
          source,
          status: "ok" as const,
          ...(await collect(http)),
          durationMs: Date.now() - start,
          calls: http.calls,
          retries: http.retries,
        };
      } catch (error) {
        return {
          source,
          status: "error" as const,
          metrics: [],
          context: [],
          missingInformation: [
            `UNKNOWN: ${source} unavailable — ${error instanceof IntegrationError ? error.message : "invalid configuration or response"}`,
          ],
          durationMs: Date.now() - start,
          calls: http.calls,
          retries: http.retries,
        };
      }
    }),
  );
}
