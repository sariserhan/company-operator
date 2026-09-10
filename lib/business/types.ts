import { z } from "zod";
export const sourceSchema = z.enum([
  "stripe",
  "posthog",
  "search_console",
  "github",
  "vercel",
  "derived",
]);
export type Source = z.infer<typeof sourceSchema>;
export const metricSchema = z.object({
  key: z.string(),
  source: sourceSchema,
  metric: z.string(),
  value: z.number().finite(),
  unit: z.string(),
  periodStart: z.number(),
  periodEnd: z.number(),
  capturedAt: z.number(),
  description: z.string(),
});
export type Metric = z.infer<typeof metricSchema>;
export const objectiveSchema = z.object({
  name: z.string(),
  metric: z.enum(["mrr", "revenue", "customers", "signups", "custom"]),
  target: z.number().nonnegative(),
  currency: z.string(),
  direction: z.enum(["increase", "decrease"]),
});
export type Objective = z.infer<typeof objectiveSchema>;
export const integrationResultSchema = z.object({
  source: sourceSchema,
  status: z.enum(["ok", "error"]),
  metrics: z.array(metricSchema),
  context: z.array(z.string()),
  missingInformation: z.array(z.string()),
  durationMs: z.number(),
  calls: z.number(),
  retries: z.number(),
});
export type IntegrationResult = z.infer<typeof integrationResultSchema>;
export const snapshotSchema = z.object({
  capturedAt: z.number(),
  objective: objectiveSchema.extend({ current: z.number().nullable() }),
  metrics: z.array(metricSchema),
  comparisons: z.array(
    z.object({
      metric: z.string(),
      current: z.number(),
      previous: z.number(),
      changePercent: z.number().nullable(),
      evidence: z.array(z.string()),
    }),
  ),
  integrations: z.array(integrationResultSchema),
  missingInformation: z.array(z.string()),
});
export type BusinessSnapshot = z.infer<typeof snapshotSchema>;
export type Env = Record<string, string | undefined>;
export const DAY = 86_400_000;
export function windowPeriod(now: number, days: number, previous = false) {
  const end = Math.floor(now / DAY) * DAY - (previous ? days * DAY : 0);
  return { start: end - days * DAY, end };
}
export function makeMetric(
  source: Source,
  metric: string,
  value: number,
  unit: string,
  start: number,
  end: number,
  now: number,
  description: string,
): Metric {
  return metricSchema.parse({
    key: `${source}:${metric}:${start}:${end}`,
    source,
    metric,
    value,
    unit,
    periodStart: start,
    periodEnd: end,
    capturedAt: now,
    description,
  });
}
