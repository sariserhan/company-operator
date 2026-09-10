import { z } from "zod";
import {
  DAY,
  makeMetric,
  windowPeriod,
  type Env,
  type Metric,
} from "../business/types";
import { bearer, required, ReadOnlyHttp } from "./http";
const row = z.object({
  keys: z.array(z.string()).optional(),
  clicks: z.number(),
  impressions: z.number(),
  ctr: z.number(),
  position: z.number(),
});
export async function collectSearchConsole(
  env: Env,
  http: ReadOnlyHttp,
  now: number,
) {
  const token = required(env, "GOOGLE_ACCESS_TOKEN"),
    site = required(env, "GOOGLE_SEARCH_CONSOLE_SITE");
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const metrics: Metric[] = [],
    context: string[] = [];
  // Use final data and leave three days for publication delay. Date labels use GSC's Pacific reporting calendar.
  for (const previous of [false, true]) {
    const { start, end } = windowPeriod(now - 3 * DAY, 28, previous);
    const base = {
      startDate: new Date(start).toISOString().slice(0, 10),
      endDate: new Date(end - DAY).toISOString().slice(0, 10),
      dataState: "final",
      type: "web",
    };
    const summary = await http.json(
      url,
      bearer(token),
      z.object({ rows: z.array(row).optional() }),
      base,
    );
    if (!summary.rows?.length) {
      context.push(
        `No final Search Console rows for ${base.startDate}–${base.endDate}; metrics UNKNOWN.`,
      );
      continue;
    }
    const total = summary.rows[0];
    for (const [metric, value, unit] of [
      ["organic_clicks", total.clicks, "clicks"],
      ["organic_impressions", total.impressions, "impressions"],
      ["organic_ctr", total.ctr, "ratio"],
      ["organic_position", total.position, "position"],
    ] as const)
      metrics.push(
        makeMetric(
          "search_console",
          metric,
          value,
          unit,
          start,
          end,
          now,
          `Final Search Console web data for ${base.startDate}–${base.endDate} (Pacific calendar date labels; three-day reporting delay)`,
        ),
      );
    for (const dimension of ["query", "page"]) {
      const result = await http.json(
        url,
        bearer(token),
        z.object({ rows: z.array(row).optional() }),
        { ...base, dimensions: [dimension], rowLimit: 20, startRow: 0 },
      );
      for (const item of result.rows ?? []) {
        const label = item.keys?.[0];
        if (!label) continue;
        for (const [suffix, value, unit] of [
          ["clicks", item.clicks, "clicks"],
          ["impressions", item.impressions, "impressions"],
        ] as const)
          metrics.push(
            makeMetric(
              "search_console",
              `organic_${dimension}_${suffix}:${label}`,
              value,
              unit,
              start,
              end,
              now,
              `Top-20 ${dimension} sample: ${label}. Missing from another period's sample means UNKNOWN, not zero.`,
            ),
          );
      }
      context.push(
        `${previous ? "Previous" : "Current"} 28-day top ${dimension} sample (not all rows): ${JSON.stringify(result.rows ?? [])}`,
      );
    }
  }
  return {
    metrics,
    context,
    missingInformation: metrics.length
      ? [
          "Search Console data is delayed three days; top queries/pages are samples.",
        ]
      : ["UNKNOWN: Search Console returned no final data."],
  };
}
