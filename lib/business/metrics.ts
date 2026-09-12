import {
  DAY,
  makeMetric,
  type BusinessSnapshot,
  type IntegrationResult,
  type Metric,
  type Objective,
} from "./types";
export function normalizeSnapshot(
  objective: Objective,
  integrations: IntegrationResult[],
  history: Metric[] = [],
  now = Date.now(),
): BusinessSnapshot {
  const metrics = integrations.flatMap((i) => i.metrics);
  const missingInformation = integrations.flatMap((i) => i.missingInformation);
  // Distinct-user event totals are NOT a cohort funnel: do not divide them into an activation rate.
  for (const m of metrics.filter(
    (m) =>
      ["posthog", "visitorping"].includes(m.source) &&
      m.metric === "signup_completed_cohort",
  )) {
    const installed = metrics.find(
      (x) =>
        x.source === m.source &&
        x.unit === m.unit &&
        x.metric === "tracking_installed_cohort" &&
        x.periodStart === m.periodStart &&
        x.periodEnd === m.periodEnd,
    );
    if (installed && m.value > 0) {
      metrics.push(
        makeMetric(
          "derived",
          "tracking_install_completion_rate",
          installed.value / m.value,
          "ratio",
          m.periodStart,
          m.periodEnd,
          now,
          `Same signup cohort: ${installed.key} / ${m.key}. Installation must follow signup within this period; recent users have less follow-up time.`,
        ),
      );
    }
  }
  const comparisons: BusinessSnapshot["comparisons"] = [];
  for (const current of metrics) {
    const duration = current.periodEnd - current.periodStart;
    if (duration !== 7 * DAY && duration !== 28 * DAY) continue;
    const previous = metrics.find(
      (p) =>
        p.source === current.source &&
        p.metric === current.metric &&
        p.unit === current.unit &&
        p.periodEnd === current.periodStart &&
        p.periodStart === current.periodStart - duration,
    );
    if (previous)
      comparisons.push({
        metric: current.metric,
        current: current.value,
        previous: previous.value,
        changePercent:
          previous.value === 0
            ? null
            : ((current.value - previous.value) / Math.abs(previous.value)) *
              100,
        evidence: [current.key, previous.key],
      });
  }
  const revenue = metrics.find(
    (m) =>
      m.source === "stripe" &&
      m.metric === "mrr" &&
      m.unit === objective.currency,
  );
  if (!revenue)
    missingInformation.push("UNKNOWN: critical Stripe MRR is unavailable.");
  if (revenue)
    for (const days of [7, 28]) {
      const previous = history
        .filter(
          (m) =>
            m.metric === "mrr" &&
            m.source === "stripe" &&
            m.unit === revenue.unit &&
            Math.abs(m.capturedAt - (now - days * DAY)) <= DAY,
        )
        .sort(
          (a, b) =>
            Math.abs(a.capturedAt - (now - days * DAY)) -
            Math.abs(b.capturedAt - (now - days * DAY)),
        )[0];
      if (previous) {
        metrics.push(previous);
        comparisons.push({
          metric: `mrr_${days}d`,
          current: revenue.value,
          previous: previous.value,
          changePercent:
            previous.value === 0
              ? null
              : ((revenue.value - previous.value) / previous.value) * 100,
          evidence: [revenue.key, previous.key],
        });
      } else
        missingInformation.push(
          `UNKNOWN: no comparable MRR snapshot ${days} days ago.`,
        );
    }
  const current =
    metrics
      .filter(
        (m) =>
          m.metric === objective.metric &&
          (objective.metric === "mrr" || objective.metric === "revenue"
            ? m.unit === objective.currency
            : true),
      )
      .sort((a, b) => b.periodEnd - a.periodEnd)[0]?.value ?? null;
  return {
    capturedAt: now,
    objective: { ...objective, current },
    metrics,
    comparisons,
    integrations,
    missingInformation: [...new Set(missingInformation)],
  };
}
