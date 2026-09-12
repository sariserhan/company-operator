import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { query, internalMutation } from "./_generated/server";
import { ownedCompany } from "./access";
import { analysisSchema, critiqueSchema } from "../lib/ai/schemas";
import { snapshotSchema } from "../lib/business/types";
import { validateAnalysis } from "../lib/business/evaluator";
export const attempt = internalMutation({
  args: {
    runId: v.id("runs"),
    analysisJson: v.string(),
    critiqueJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "running") throw new Error("Run not active");
    const analysis = analysisSchema.parse(JSON.parse(args.analysisJson)),
      critique = critiqueSchema.parse(JSON.parse(args.critiqueJson));
    await ctx.db.insert("events", {
      companyId: run.companyId,
      runId: run._id,
      type: "ANALYSIS_REVIEWED",
      payloadJson: JSON.stringify({ analysis, critique }),
      timestamp: Date.now(),
    });
    return null;
  },
});
export const complete = internalMutation({
  args: {
    runId: v.id("runs"),
    analysisJson: v.string(),
    critiqueJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "running" || !run.snapshotJson)
      throw new Error("Run not ready");
    const analysis = analysisSchema.parse(JSON.parse(args.analysisJson)),
      critique = critiqueSchema.parse(JSON.parse(args.critiqueJson)),
      snapshot = snapshotSchema.parse(JSON.parse(run.snapshotJson));
    validateAnalysis(analysis, snapshot);
    if (!critique.accepted || critique.severity === "high")
      throw new Error("Critic did not accept this recommendation");
    const companyId = run.companyId,
      runId = run._id,
      now = Date.now();
    const event = async (type: string, payload: unknown) => {
      await ctx.db.insert("events", {
        companyId,
        runId,
        type,
        payloadJson: JSON.stringify(payload),
        timestamp: now,
      });
    };
    const observationIds: Id<"observations">[] = [];
    for (const observation of analysis.observations) {
      const id = await ctx.db.insert("observations", {
        companyId,
        runId,
        statement: observation.statement,
        evidence: observation.evidence.map((key) =>
          snapshot.metrics.find((m) => m.key === key)!,
        ),
        importance: observation.importance,
        createdAt: now,
      });
      observationIds.push(id);
      await event("OBSERVATION_CREATED", { id });
    }
    const hypothesisIds = [];
    for (const h of analysis.hypotheses) {
      const id = await ctx.db.insert("hypotheses", {
        companyId,
        runId,
        statement: h.statement,
        basedOnObservationIds: h.observationIndexes.map(
          (i) => observationIds[i],
        ),
        confidence: h.confidence,
        status: "untested",
        createdAt: now,
      });
      hypothesisIds.push(id);
      await event("HYPOTHESIS_CREATED", { id });
    }
    const e = analysis.recommendedExperiment;
    const experimentId = await ctx.db.insert("experiments", {
      companyId,
      runId,
      hypothesisId: hypothesisIds[e.hypothesisIndex],
      title: e.title,
      description: e.proposedChange,
      successMetric: e.successMetric,
      baselineValue: e.baseline,
      targetValue: e.target,
      direction: e.direction,
      expectedImpact: e.expectedImpact,
      confidence: e.confidence,
      estimatedCostUsd: e.estimatedCostUsd,
      estimatedEffort: e.effort,
      measurementPlan: e.measurementPlan,
      status: "proposed",
      createdAt: now,
    });
    await event("EXPERIMENT_PROPOSED", { experimentId });
    // One durable current-constraint belief. Historical revisions remain in the append-only event log.
    const subject = "current_business_constraint",
      existing = await ctx.db
        .query("beliefs")
        .withIndex("by_companyId_and_subject", (q) =>
          q.eq("companyId", companyId).eq("subject", subject),
        )
        .unique();
    const belief = {
      statement: analysis.currentBottleneck.statement,
      confidence: analysis.currentBottleneck.confidence,
      status: "active" as const,
      supportingEvidence: analysis.currentBottleneck.evidence,
      updatedAt: now,
      runId,
    };
    if (existing) {
      await event("BELIEF_UPDATED", { previous: existing, next: belief });
      await ctx.db.patch(existing._id, belief);
    } else {
      const id = await ctx.db.insert("beliefs", {
        companyId,
        subject,
        ...belief,
        createdAt: now,
      });
      await event("BELIEF_UPDATED", { id, next: belief });
    }
    await ctx.db.patch(runId, {
      status: "completed",
      completedAt: now,
      summary: analysis.executiveSummary,
      analysisJson: JSON.stringify(analysis),
      critiqueJson: JSON.stringify(critique),
    });
    await event("RUN_COMPLETED", { durationMs: now - run.startedAt });
    return null;
  },
});
const tableV = v.union(
  v.literal("observations"),
  v.literal("hypotheses"),
  v.literal("experiments"),
  v.literal("beliefs"),
  v.literal("events"),
);
export const list = query({
  args: {
    companyId: v.id("companies"),
    table: tableV,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(v.string()),
  handler: async (ctx, { companyId, table, paginationOpts }) => {
    await ownedCompany(ctx, companyId);
    const rows = await ctx.db
      .query(table)
      .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
      .order("desc")
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, 50),
      });
    return {
      ...rows,
      page: rows.page.map((r) => JSON.stringify(r)),
    };
  },
});
