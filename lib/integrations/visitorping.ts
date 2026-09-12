import { z } from "zod";
import {
  makeMetric,
  windowPeriod,
  type Env,
  type Metric,
} from "../business/types";
import { bearer, required, ReadOnlyHttp, IntegrationError } from "./http";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const period = z
  .object({
    start: z.number().int(),
    end: z.number().int(),
    websiteVisitors: count,
    websiteSessions: count,
    newWorkspaces: count,
    activatedNewWorkspaces: count,
    checkoutStartedWorkspaces: count,
    subscriptionStartedWorkspaces: count,
  })
  .refine(
    (p) => p.activatedNewWorkspaces <= p.newWorkspaces,
    "Invalid activation cohort",
  );
const responseSchema = z.object({
  schemaVersion: z.literal(1),
  capturedAt: z.number().int(),
  siteDomain: z.enum(["visitorping.com", "www.visitorping.com"]),
  periods: z.array(period).length(2),
});
export async function collectVisitorping(
  env: Env,
  http: ReadOnlyHttp,
  now: number,
) {
  const token = required(env, "VISITORPING_ANALYTICS_TOKEN");
  const endpoint =
    env.VISITORPING_ANALYTICS_URL ??
    "https://visitorping.com/api/operator/analytics";
  const url = new URL(endpoint);
  // Do not let an overridden URL exfiltrate this credential to another integration.
  if (
    url.protocol !== "https:" ||
    !["visitorping.com", "www.visitorping.com"].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/api/operator/analytics" ||
    url.search ||
    url.hash
  )
    throw new IntegrationError("Invalid VisitorPing analytics endpoint");
  const current = windowPeriod(now, 7);
  url.searchParams.set("end", new Date(current.end).toISOString().slice(0, 10));
  const result = await http.json(url.toString(), bearer(token), responseSchema);
  if (Math.abs(result.capturedAt - now) > 5 * 60_000)
    throw new IntegrationError("VisitorPing snapshot is stale");
  const metrics: Metric[] = [];
  for (const previous of [false, true]) {
    const { start, end } = windowPeriod(now, 7, previous);
    const p = result.periods.find((p) => p.start === start && p.end === end);
    if (!p)
      throw new IntegrationError(
        "VisitorPing returned mismatched reporting periods",
      );
    for (const [metric, value, unit, description] of [
      [
        "website_visitors",
        p.websiteVisitors,
        "visitors",
        "Distinct tracked visitor IDs on VisitorPing's own website; all bot classifications included",
      ],
      [
        "sessions",
        p.websiteSessions,
        "sessions",
        "Stored sessions starting in the period on VisitorPing's own website; all bot classifications included",
      ],
      [
        "signup_completed_cohort",
        p.newWorkspaces,
        "workspaces",
        "Existing workspaces created in the period; not individual user signups",
      ],
      [
        "tracking_installed_cohort",
        p.activatedNewWorkspaces,
        "workspaces",
        "New-workspace cohort with a tracking_verified milestone at or after workspace creation and before period end",
      ],
      [
        "checkout_started",
        p.checkoutStartedWorkspaces,
        "workspaces",
        "Workspaces with their first recorded checkout_started milestone in the period; not a signup cohort",
      ],
      [
        "paid_conversion",
        p.subscriptionStartedWorkspaces,
        "workspaces",
        "Workspaces with their first recorded subscription_started milestone in the period; Stripe remains the revenue authority",
      ],
    ] as const)
      metrics.push(
        makeMetric(
          "visitorping",
          metric,
          value,
          unit,
          start,
          end,
          result.capturedAt,
          description,
        ),
      );
  }
  return {
    metrics,
    context: [
      "Native VisitorPing aggregate analytics; no customer identities, browsing histories, or session credentials are collected.",
    ],
    missingInformation: [
      "Workspace counts include all existing workspaces (including internal/test workspaces); deleted workspaces and deleted tracker data are not reconstructed.",
      "Activation milestones are best-effort telemetry and may be incomplete for older workspaces. A zero recorded milestone count does not prove no activation occurred.",
      "Within-period activation gives recent workspaces less follow-up time. Website visitors and workspace cohorts are different populations; do not divide them into a conversion rate.",
      "UNKNOWN: signup starts, pricing-page views, and weekly product retention are not exposed by the native aggregate endpoint.",
    ],
  };
}
