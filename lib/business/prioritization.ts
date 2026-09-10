import type { z } from "zod";
import type { opportunitySchema } from "../ai/schemas";
export function rankOpportunities(
  opportunities: z.infer<typeof opportunitySchema>[],
) {
  return opportunities
    .map((o) => ({
      ...o,
      score:
        (o.estimatedImpact * o.confidence * o.urgencyMultiplier) /
        { small: 1, medium: 2, large: 4 }[o.effort] /
        Math.max(o.estimatedCostUsd / 100, 1),
    }))
    .sort((a, b) => b.score - a.score);
}
