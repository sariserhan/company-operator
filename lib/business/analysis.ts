import {
  analysisSchema,
  critiqueSchema,
  diagnosisSchema,
  experimentSchema,
  observationsSchema,
  type CompanyAnalysis,
  type Critique,
} from "../ai/schemas";
import { stages } from "../ai/prompts";
import type { ReasoningProvider } from "../ai/provider";
import type { BusinessSnapshot } from "./types";
import { rankOpportunities } from "./prioritization";
import { validateAnalysis, validateEvidence } from "./evaluator";
export type AnalysisAttempt = { analysis: CompanyAnalysis; critique: Critique };
export async function analyzeCompany(
  snapshot: BusinessSnapshot,
  provider: ReasoningProvider,
  beliefs: unknown[],
  onAttempt: (attempt: AnalysisAttempt) => Promise<void>,
) {
  let revision: Critique | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const input = { snapshot, priorBeliefs: beliefs, revision };
    const observed = await provider.generate(
      "observations",
      stages.observations,
      input,
      observationsSchema,
      (result) => validateEvidence(result.observations, snapshot),
    );
    const diagnosis = await provider.generate(
      "diagnosis",
      stages.diagnosis,
      { ...input, ...observed },
      diagnosisSchema,
      (result) => {
        validateEvidence(
          [
            {
              statement: result.currentBottleneck.statement,
              evidence: result.currentBottleneck.evidence,
              importance: 1,
            },
          ],
          snapshot,
        );
        if (
          result.hypotheses.some((h) =>
            h.observationIndexes.some((i) => i >= observed.observations.length),
          ) ||
          result.opportunities.some(
            (o) => o.hypothesisIndex >= result.hypotheses.length,
          )
        )
          throw new Error("Invalid diagnosis references");
      },
    );
    const opportunities = rankOpportunities(diagnosis.opportunities);
    const base = {
      ...diagnosis,
      observations: observed.observations,
      opportunities,
      missingInformation: [
        ...new Set([
          ...snapshot.missingInformation,
          ...observed.missingInformation,
        ]),
      ],
    };
    const experiment = await provider.generate(
      "experiment",
      stages.experiment,
      { ...input, ...base, highestRankedOpportunity: opportunities[0] },
      experimentSchema,
      (e) => validateAnalysis({ ...base, recommendedExperiment: e }, snapshot),
    );
    const analysis = analysisSchema.parse({
      ...base,
      recommendedExperiment: experiment,
    });
    validateAnalysis(analysis, snapshot);
    const critique = await provider.generate(
      "critique",
      stages.critique,
      { objective: snapshot.objective, snapshot, analysis },
      critiqueSchema,
    );
    await onAttempt({ analysis, critique });
    if (critique.accepted && critique.severity !== "high")
      return { analysis, critique };
    revision = critique;
  }
  throw new Error(
    "Critic rejected the recommendation after two analysis attempts",
  );
}
