import { z } from "zod";
import {
  makeMetric,
  windowPeriod,
  type Env,
  type Metric,
} from "../business/types";
import { bearer, required, ReadOnlyHttp, IntegrationError } from "./http";
const literal = (s: string) =>
  `'${s.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
export async function collectPosthog(
  env: Env,
  http: ReadOnlyHttp,
  now: number,
) {
  const host = env.POSTHOG_HOST ?? "https://us.posthog.com",
    project = required(env, "POSTHOG_PROJECT_ID");
  if (!/^\d+$/.test(project))
    throw new IntegrationError("Invalid PostHog project ID");
  const token = required(env, "POSTHOG_PERSONAL_API_KEY");
  const mapping = z
    .record(z.string(), z.string().min(1).max(200))
    .parse(JSON.parse(required(env, "POSTHOG_EVENT_MAP")));
  const metrics: Metric[] = [],
    missingInformation: string[] = [];
  const query = async (sql: string) => {
    const result = await http.json(
      `${host}/api/projects/${project}/query/`,
      bearer(token),
      z.object({ results: z.array(z.array(z.unknown())) }),
      {
        query: { kind: "HogQLQuery", query: sql },
        name: "Company Operator read-only snapshot",
      },
    );
    return result.results;
  };
  const events = { website_visitors: "$pageview", ...mapping };
  for (const previous of [false, true]) {
    const { start, end } = windowPeriod(now, 7, previous),
      where = `timestamp >= toDateTime(${start / 1000}) AND timestamp < toDateTime(${end / 1000})`;
    const rows = await query(
      `SELECT event, uniqExact(person_id) FROM events WHERE ${where} AND event IN (${Object.values(events).map(literal).join(",")}) GROUP BY event`,
    );
    const counts = new Map(
      rows.map((r) => [
        z.string().parse(r[0]),
        z.coerce.number().nonnegative().parse(r[1]),
      ]),
    );
    for (const [metric, event] of Object.entries(events))
      metrics.push(
        makeMetric(
          "posthog",
          metric,
          counts.get(event) ?? 0,
          "people",
          start,
          end,
          now,
          `Distinct people with event ${event}; event totals are not a sequential cohort funnel`,
        ),
      );
    const sessions = await query(
      `SELECT uniqExact(properties.$session_id) FROM events WHERE ${where} AND properties.$session_id IS NOT NULL AND properties.$session_id != ''`,
    );
    metrics.push(
      makeMetric(
        "posthog",
        "sessions",
        z.coerce.number().nonnegative().parse(sessions[0]?.[0]),
        "sessions",
        start,
        end,
        now,
        "Distinct non-empty PostHog session IDs",
      ),
    );
    if (mapping.activation_event) {
      const previousStart = start - (end - start);
      const retained = await query(
        `SELECT count(), countIf(current_events > 0) FROM (SELECT person_id, countIf(timestamp < toDateTime(${start / 1000})) AS previous_events, countIf(timestamp >= toDateTime(${start / 1000})) AS current_events FROM events WHERE timestamp >= toDateTime(${previousStart / 1000}) AND timestamp < toDateTime(${end / 1000}) AND event = ${literal(mapping.activation_event)} GROUP BY person_id HAVING previous_events > 0)`,
      );
      const cohortSize = z.coerce
          .number()
          .nonnegative()
          .parse(retained[0]?.[0]),
        returned = z.coerce.number().nonnegative().parse(retained[0]?.[1]);
      if (returned > cohortSize)
        throw new IntegrationError("Retention cohort exceeds baseline");
      metrics.push(
        makeMetric(
          "posthog",
          "retention_baseline_people",
          cohortSize,
          "people",
          start,
          end,
          now,
          "People with activation event in the previous seven days",
        ),
      );
      metrics.push(
        makeMetric(
          "posthog",
          "retained_people",
          returned,
          "people",
          start,
          end,
          now,
          "Baseline people returning with the same activation event in the current seven days",
        ),
      );
      if (cohortSize > 0)
        metrics.push(
          makeMetric(
            "posthog",
            "weekly_retention_rate",
            returned / cohortSize,
            "ratio",
            start,
            end,
            now,
            "Rolling weekly activity retention; not new-user or subscription retention",
          ),
        );
    } else
      missingInformation.push(
        "UNKNOWN: configure activation_event to measure weekly activity retention.",
      );
    if (mapping.signup_completed && mapping.tracking_installed) {
      const cohort = await query(
        `SELECT count(), countIf(installed_at >= signup_at AND installed_at < toDateTime(${end / 1000})) FROM (SELECT person_id, minIf(timestamp, event = ${literal(mapping.signup_completed)}) AS signup_at, maxIf(timestamp, event = ${literal(mapping.tracking_installed)}) AS installed_at FROM events WHERE ${where} AND event IN (${literal(mapping.signup_completed)}, ${literal(mapping.tracking_installed)}) GROUP BY person_id HAVING countIf(event = ${literal(mapping.signup_completed)}) > 0)`,
      );
      const row = z
        .tuple([
          z.coerce.number().nonnegative(),
          z.coerce.number().nonnegative(),
        ])
        .parse(cohort[0]);
      if (row[1] > row[0])
        throw new IntegrationError("Installation cohort exceeds signups");
      metrics.push(
        makeMetric(
          "posthog",
          "signup_completed_cohort",
          row[0],
          "people",
          start,
          end,
          now,
          "People completing signup within this window",
        ),
      );
      metrics.push(
        makeMetric(
          "posthog",
          "tracking_installed_cohort",
          row[1],
          "people",
          start,
          end,
          now,
          "People from the signup cohort with installation at or after signup, within the same window",
        ),
      );
    } else
      missingInformation.push(
        "UNKNOWN: configure signup_completed and tracking_installed event mappings to measure cohort activation.",
      );
  }
  missingInformation.push(
    "Cohort activation uses within-window follow-up; recent signups have less time to activate.",
    "Weekly activity retention does not establish long-term customer retention.",
  );
  return {
    metrics,
    context: [
      "PostHog event mapping is configured by the operator; verify it against the actual event taxonomy.",
    ],
    missingInformation,
  };
}
