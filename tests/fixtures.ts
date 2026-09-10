import type { CompanyAnalysis } from "../lib/ai/schemas";
import {
  makeMetric,
  DAY,
  type IntegrationResult,
  type Objective,
} from "../lib/business/types";
import { normalizeSnapshot } from "../lib/business/metrics";
export const now = Date.UTC(2026, 8, 10),
  start = now - 7 * DAY;
export const objective: Objective = {
  name: "Reach $5,000 MRR",
  metric: "mrr",
  target: 5000,
  currency: "USD",
  direction: "increase",
};
export function fixtureSnapshot() {
  const integration = (
    source: IntegrationResult["source"],
    metrics: IntegrationResult["metrics"],
  ): IntegrationResult => ({
    source,
    status: "ok",
    metrics,
    context: [],
    missingInformation: [],
    durationMs: 5,
    calls: 1,
    retries: 0,
  });
  return normalizeSnapshot(
    objective,
    [
      integration("stripe", [
        makeMetric("stripe", "mrr", 228, "USD", now, now, now, "Gross MRR"),
      ]),
      integration("posthog", [
        makeMetric(
          "posthog",
          "signup_completed_cohort",
          38,
          "people",
          start,
          now,
          now,
          "Signup cohort",
        ),
        makeMetric(
          "posthog",
          "tracking_installed_cohort",
          9,
          "people",
          start,
          now,
          now,
          "Installations in signup cohort",
        ),
      ]),
    ],
    [],
    now,
  );
}
export function fixtureAnalysis(): CompanyAnalysis {
  const snapshot = fixtureSnapshot(),
    rate = snapshot.metrics.find(
      (m) => m.metric === "tracking_install_completion_rate",
    )!;
  return {
    executiveSummary: "Activation is the current observed constraint.",
    currentBottleneck: {
      area: "activation",
      statement: "9 of 38 signup-cohort users installed tracking.",
      evidence: [snapshot.metrics[1].key, snapshot.metrics[2].key],
      severity: 0.8,
      confidence: 0.7,
    },
    observations: [
      {
        statement: "9 of 38 signup-cohort users installed tracking.",
        evidence: [snapshot.metrics[1].key, snapshot.metrics[2].key],
        importance: 0.9,
      },
    ],
    hypotheses: [
      {
        statement: "Installation may be technically difficult.",
        confidence: 0.7,
        observationIndexes: [0],
      },
    ],
    opportunities: [
      {
        title: "Simplify installation",
        description: "Test platform-specific installation instructions.",
        estimatedImpact: 60,
        confidence: 0.7,
        estimatedCostUsd: 0,
        effort: "small",
        urgencyMultiplier: 1,
        hypothesisIndex: 0,
        score: 42,
      },
    ],
    assumptions: ["Technical difficulty has not been established."],
    recommendedExperiment: {
      title: "Test simplified installation",
      hypothesisIndex: 0,
      proposedChange:
        "Propose platform-specific instructions and verification.",
      successMetric: rate.metric,
      baseline: rate.value,
      baselineEvidence: rate.key,
      target: 0.4,
      direction: "increase",
      expectedImpact: "More activated users may enter the paid funnel.",
      estimatedCostUsd: 0,
      confidence: 0.7,
      effort: "small",
      measurementPlan:
        "Randomize new signups for 14 days, allow seven days follow-up per user, compare installation rates. Retain only if improvement exceeds uncertainty.",
    },
    missingInformation: snapshot.missingInformation,
  };
}
