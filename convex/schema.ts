import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const providerV = v.union(v.literal("openai"), v.literal("anthropic"));
export const sourceV = v.union(
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("search_console"),
  v.literal("github"),
  v.literal("vercel"),
  v.literal("derived"),
);
export const metricV = v.object({
  key: v.string(),
  source: sourceV,
  metric: v.string(),
  value: v.number(),
  unit: v.string(),
  periodStart: v.number(),
  periodEnd: v.number(),
  capturedAt: v.number(),
  description: v.string(),
});
export const objectiveFields = {
  name: v.string(),
  metric: v.union(
    v.literal("mrr"),
    v.literal("revenue"),
    v.literal("customers"),
    v.literal("signups"),
    v.literal("custom"),
  ),
  target: v.number(),
  currency: v.string(),
  direction: v.union(v.literal("increase"), v.literal("decrease")),
};
const companyId = v.id("companies"),
  runId = v.id("runs");
export const runStatusV = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);
export const usageV = v.object({
  stage: v.string(),
  attempt: v.number(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  cachedInputTokens: v.number(),
  durationMs: v.number(),
  costUsd: v.union(v.number(), v.null()),
});
export default defineSchema({
  companies: defineTable({
    ownerId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.string(),
    status: v.union(v.literal("active"), v.literal("paused")),
    createdAt: v.number(),
  }).index("by_ownerId", ["ownerId"]),
  objectives: defineTable({
    companyId,
    ...objectiveFields,
    status: v.union(
      v.literal("active"),
      v.literal("achieved"),
      v.literal("paused"),
    ),
    priority: v.number(),
    createdAt: v.number(),
  }).index("by_companyId_and_status", ["companyId", "status"]),
  settings: defineTable({
    companyId,
    provider: providerV,
    model: v.string(),
  }).index("by_companyId", ["companyId"]),
  metrics: defineTable({ companyId, runId, ...metricV.fields })
    .index("by_companyId_and_metric_and_capturedAt", [
      "companyId",
      "metric",
      "capturedAt",
    ])
    .index("by_runId", ["runId"]),
  runs: defineTable({
    companyId,
    trigger: v.union(v.literal("manual"), v.literal("scheduled")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: runStatusV,
    provider: providerV,
    model: v.string(),
    promptVersion: v.string(),
    analysisVersion: v.string(),
    objective: v.object(objectiveFields),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    snapshotJson: v.optional(v.string()),
    analysisJson: v.optional(v.string()),
    critiqueJson: v.optional(v.string()),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costUsd: v.union(v.number(), v.null()),
    externalApiCostUsd: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_companyId_and_status", ["companyId", "status"]),
  observations: defineTable({
    companyId,
    runId,
    statement: v.string(),
    evidence: v.array(metricV),
    importance: v.number(),
    createdAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_runId", ["runId"]),
  hypotheses: defineTable({
    companyId,
    runId,
    statement: v.string(),
    basedOnObservationIds: v.array(v.id("observations")),
    confidence: v.number(),
    status: v.union(
      v.literal("untested"),
      v.literal("testing"),
      v.literal("supported"),
      v.literal("rejected"),
      v.literal("inconclusive"),
    ),
    createdAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_runId", ["runId"]),
  experiments: defineTable({
    companyId,
    runId,
    hypothesisId: v.id("hypotheses"),
    title: v.string(),
    description: v.string(),
    successMetric: v.string(),
    baselineValue: v.union(v.number(), v.null()),
    targetValue: v.union(v.number(), v.null()),
    direction: v.string(),
    expectedImpact: v.string(),
    confidence: v.number(),
    estimatedCostUsd: v.number(),
    estimatedEffort: v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large"),
    ),
    measurementPlan: v.string(),
    status: v.literal("proposed"),
    createdAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_runId", ["runId"]),
  beliefs: defineTable({
    companyId,
    subject: v.string(),
    statement: v.string(),
    confidence: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("superseded"),
      v.literal("invalidated"),
    ),
    supportingEvidence: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    runId,
  })
    .index("by_companyId", ["companyId"])
    .index("by_companyId_and_subject", ["companyId", "subject"]),
  events: defineTable({
    companyId,
    runId: v.optional(runId),
    type: v.string(),
    payloadJson: v.string(),
    timestamp: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_runId", ["runId"]),
  modelUsage: defineTable({ companyId, runId, ...usageV.fields }).index(
    "by_runId",
    ["runId"],
  ),
  // Reserved for later measurement phases; V1 exposes no action execution or result fabrication APIs.
  actions: defineTable({
    companyId,
    experimentId: v.id("experiments"),
    description: v.string(),
    status: v.literal("proposed"),
    createdAt: v.number(),
  }).index("by_companyId", ["companyId"]),
  results: defineTable({
    companyId,
    experimentId: v.id("experiments"),
    metric: v.string(),
    value: v.number(),
    evidence: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_companyId", ["companyId"]),
});
