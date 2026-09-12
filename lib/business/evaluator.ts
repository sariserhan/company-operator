import type { CompanyAnalysis, Observation } from "../ai/schemas";
import type { BusinessSnapshot } from "./types";
export function validateEvidence(
  observations: Observation[],
  snapshot: BusinessSnapshot,
) {
  const keys = new Set(snapshot.metrics.map((m) => m.key));
  for (const o of observations)
    for (const key of o.evidence)
      if (!keys.has(key))
        throw new Error(`Unsupported evidence reference: ${key}`);
}
export function validateAnalysis(
  analysis: CompanyAnalysis,
  snapshot: BusinessSnapshot,
) {
  validateEvidence(analysis.observations, snapshot);
  validateEvidence(
    [
      {
        statement: analysis.currentBottleneck.statement,
        evidence: analysis.currentBottleneck.evidence,
        importance: 1,
      },
    ],
    snapshot,
  );
  for (const h of analysis.hypotheses)
    if (h.observationIndexes.some((i) => i >= analysis.observations.length))
      throw new Error("Hypothesis references an absent observation");
  for (const o of analysis.opportunities)
    if (o.hypothesisIndex >= analysis.hypotheses.length)
      throw new Error("Opportunity references an absent hypothesis");
  const e = analysis.recommendedExperiment;
  if (e.hypothesisIndex >= analysis.hypotheses.length)
    throw new Error("Experiment references an absent hypothesis");
  if (e.baseline !== null) {
    const metric = snapshot.metrics.find((m) => m.key === e.baselineEvidence);
    if (!metric)
      throw new Error(
        "Experiment baselineEvidence must exactly match a snapshot metric key",
      );
    if (metric.metric !== e.successMetric)
      throw new Error(
        "Experiment successMetric must exactly match the metric field, without source prefixes, units or labels",
      );
    if (Math.abs(metric.value - e.baseline) > 1e-8)
      throw new Error(
        "Experiment baseline must equal the selected metric value without rounding or conversion",
      );
  } else if (e.baselineEvidence !== null)
    throw new Error("Unknown baseline cannot have evidence");
  if (
    e.target !== null &&
    e.baseline !== null &&
    ((e.direction === "increase" && e.target <= e.baseline) ||
      (e.direction === "decrease" && e.target >= e.baseline))
  )
    throw new Error("Experiment target does not improve its baseline");
  const top = analysis.opportunities[0];
  if (e.hypothesisIndex !== top.hypothesisIndex)
    throw new Error("Experiment must test the highest-ranked opportunity");
}
