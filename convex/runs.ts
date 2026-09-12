import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { operator, ownedCompany } from "./access";
import { objectiveSchema, snapshotSchema, DAY } from "../lib/business/types";
import { PROMPT_VERSION } from "../lib/ai/prompts";
import { objectiveFields, providerV, runStatusV, usageV } from "./schema";
export const start = mutation({
  args: { companyId: v.id("companies") },
  returns: v.id("runs"),
  handler: async (ctx, { companyId }) => {
    const company = await ownedCompany(ctx, companyId);
    if (company.status !== "active") throw new Error("Company is paused");
    const running = await ctx.db
      .query("runs")
      .withIndex("by_companyId_and_status", (q) =>
        q.eq("companyId", companyId).eq("status", "running"),
      )
      .first();
    if (running) return running._id;
    const last = await ctx.db
      .query("runs")
      .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
      .order("desc")
      .first();
    if (last && Date.now() - last.startedAt < 60_000)
      throw new Error("Wait one minute between runs");
    const objective = await ctx.db
      .query("objectives")
      .withIndex("by_companyId_and_status", (q) =>
        q.eq("companyId", companyId).eq("status", "active"),
      )
      .first();
    if (!objective) throw new Error("No active objective");
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
      .unique();
    if (!settings) throw new Error("Missing provider settings");
    const runId = await ctx.db.insert("runs", {
      companyId,
      trigger: "manual",
      startedAt: Date.now(),
      status: "running",
      provider: settings.provider,
      model: settings.model,
      promptVersion: PROMPT_VERSION,
      analysisVersion: "1.0.0",
      objective: objectiveSchema.parse(objective),
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      externalApiCostUsd: 0,
    });
    await ctx.db.insert("events", {
      companyId,
      runId,
      type: "RUN_STARTED",
      payloadJson: "{}",
      timestamp: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.companyCycle.runCompanyCycle, {
      runId,
    });
    await ctx.scheduler.runAfter(11 * 60_000, internal.runs.timeout, { runId });
    return runId;
  },
});
export const timeout = internalMutation({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (run?.status === "running") {
      await ctx.db.patch(runId, {
        status: "failed",
        error: "Run exceeded its execution deadline",
        completedAt: Date.now(),
      });
      await ctx.db.insert("events", {
        companyId: run.companyId,
        runId,
        type: "RUN_FAILED",
        payloadJson: '{"reason":"deadline"}',
        timestamp: Date.now(),
      });
    }
    return null;
  },
});
export const context = internalQuery({
  args: { runId: v.id("runs") },
  returns: v.object({
    companyId: v.id("companies"),
    objective: v.object(objectiveFields),
    provider: providerV,
    model: v.string(),
    historyJson: v.string(),
    beliefsJson: v.string(),
  }),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "running") throw new Error("Run is not active");
    const [history, beliefs] = await Promise.all([
      ctx.db
        .query("metrics")
        .withIndex("by_companyId_and_metric_and_capturedAt", (q) =>
          q
            .eq("companyId", run.companyId)
            .eq("metric", "mrr")
            .gte("capturedAt", run.startedAt - 30 * DAY),
        )
        .order("desc")
        .take(500),
      ctx.db
        .query("beliefs")
        .withIndex("by_companyId", (q) => q.eq("companyId", run.companyId))
        .order("desc")
        .take(100),
    ]);
    return {
      companyId: run.companyId,
      objective: run.objective,
      provider: run.provider,
      model: run.model,
      historyJson: JSON.stringify(history),
      beliefsJson: JSON.stringify(beliefs.filter((b) => b.status === "active")),
    };
  },
});
export const snapshot = internalMutation({
  args: { runId: v.id("runs"), snapshotJson: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, snapshotJson }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "running") throw new Error("Run is not active");
    if (run.snapshotJson) throw new Error("Snapshot is immutable");
    const snapshot = snapshotSchema.parse(JSON.parse(snapshotJson));
    await ctx.db.patch(runId, { snapshotJson: JSON.stringify(snapshot) });
    for (const metric of snapshot.metrics)
      if (metric.capturedAt === snapshot.capturedAt)
        await ctx.db.insert("metrics", {
          companyId: run.companyId,
          runId,
          ...metric,
        });
    for (const integration of snapshot.integrations)
      await ctx.db.insert("events", {
        companyId: run.companyId,
        runId,
        type: "METRICS_FETCHED",
        payloadJson: JSON.stringify({
          source: integration.source,
          status: integration.status,
          calls: integration.calls,
          retries: integration.retries,
          durationMs: integration.durationMs,
          missingInformation: integration.missingInformation,
        }),
        timestamp: Date.now(),
      });
    await ctx.db.insert("events", {
      companyId: run.companyId,
      runId,
      type: "BUSINESS_SNAPSHOT_CREATED",
      payloadJson: JSON.stringify({ metricCount: snapshot.metrics.length }),
      timestamp: Date.now(),
    });
    return null;
  },
});
export const usage = internalMutation({
  args: { runId: v.id("runs"), usage: usageV },
  returns: v.null(),
  handler: async (ctx, { runId, usage }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error("Run not found");
    await ctx.db.insert("modelUsage", {
      companyId: run.companyId,
      runId,
      ...usage,
    });
    await ctx.db.patch(runId, {
      inputTokens: run.inputTokens + usage.inputTokens,
      outputTokens: run.outputTokens + usage.outputTokens,
      costUsd:
        run.costUsd === null || usage.costUsd === null
          ? null
          : run.costUsd + usage.costUsd,
    });
    return null;
  },
});
export const fail = internalMutation({
  args: { runId: v.id("runs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, error }) => {
    const run = await ctx.db.get(runId);
    if (run?.status === "running") {
      await ctx.db.patch(runId, {
        status: "failed",
        error,
        completedAt: Date.now(),
      });
      await ctx.db.insert("events", {
        companyId: run.companyId,
        runId,
        type: "RUN_FAILED",
        payloadJson: JSON.stringify({ error }),
        timestamp: Date.now(),
      });
    }
    return null;
  },
});
const summaryV = v.object({
  _id: v.id("runs"),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  status: runStatusV,
  model: v.string(),
  provider: providerV,
  summary: v.optional(v.string()),
  error: v.optional(v.string()),
  costUsd: v.union(v.number(), v.null()),
});
export const list = query({
  args: {
    companyId: v.id("companies"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(summaryV),
  handler: async (ctx, { companyId, paginationOpts }) => {
    await ownedCompany(ctx, companyId);
    const result = await ctx.db
      .query("runs")
      .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
      .order("desc")
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, 50),
      });
    return {
      ...result,
      page: result.page.map((r) => ({
        _id: r._id,
        startedAt: r.startedAt,
        ...(r.completedAt ? { completedAt: r.completedAt } : {}),
        status: r.status,
        model: r.model,
        provider: r.provider,
        ...(r.summary ? { summary: r.summary } : {}),
        ...(r.error ? { error: r.error } : {}),
        costUsd: r.costUsd,
      })),
    };
  },
});
export const detail = query({
  args: { runId: v.id("runs") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { runId }) => {
    const user = await operator(ctx);
    const run = await ctx.db.get(runId);
    if (!run) return null;
    const company = await ctx.db.get(run.companyId);
    if (!company || company.ownerId !== user) return null;
    const [events, usage] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_runId", (q) => q.eq("runId", runId))
        .take(200),
      ctx.db
        .query("modelUsage")
        .withIndex("by_runId", (q) => q.eq("runId", runId))
        .take(32),
    ]);
    return JSON.stringify({ run, events, usage });
  },
});
export const latest = query({
  args: { companyId: v.id("companies") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { companyId }) => {
    await ownedCompany(ctx, companyId);
    const run = await ctx.db
      .query("runs")
      .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
      .order("desc")
      .first();
    return run ? JSON.stringify(run) : null;
  },
});
