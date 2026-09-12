"use node";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { operator } from "./access";
import {
  collectIntegrations,
  integrationConfiguration,
} from "../lib/integrations";
import { normalizeSnapshot } from "../lib/business/metrics";
import { analyzeCompany } from "../lib/business/analysis";
import { OpenAIProvider } from "../lib/ai/openai";
import { GatewayProvider } from "../lib/ai/gateway";
import { AnthropicProvider } from "../lib/ai/anthropic";
import { ProviderError } from "../lib/ai/provider";
import { metricSchema } from "../lib/business/types";
import { z } from "zod";
export const runCompanyCycle = internalAction({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    try {
      const context = await ctx.runQuery(internal.runs.context, { runId }),
        now = Date.now();
      const integrations = await collectIntegrations(
        process.env,
        context.objective.currency,
        now,
      );
      const snapshot = normalizeSnapshot(
        context.objective,
        integrations,
        z.array(metricSchema).parse(JSON.parse(context.historyJson)),
        now,
      );
      await ctx.runMutation(internal.runs.snapshot, {
        runId,
        snapshotJson: JSON.stringify(snapshot),
      });
      if (
        !snapshot.metrics.some(
          (m) => m.source === "stripe" && m.metric === "mrr",
        )
      ) {
        await ctx.runMutation(internal.runs.fail, {
          runId,
          error:
            "Critical Stripe MRR unavailable. Inspect integration events; no analysis was generated.",
        });
        return null;
      }
      const Provider =
        context.provider === "vercel_gateway"
          ? GatewayProvider
          : context.provider === "openai"
            ? OpenAIProvider
            : AnthropicProvider;
      const provider = new Provider(
        context.model,
        process.env,
        async (usage) => {
          await ctx.runMutation(internal.runs.usage, { runId, usage });
        },
      );
      const result = await analyzeCompany(
        snapshot,
        provider,
        JSON.parse(context.beliefsJson),
        async (attempt) => {
          await ctx.runMutation(internal.state.attempt, {
            runId,
            analysisJson: JSON.stringify(attempt.analysis),
            critiqueJson: JSON.stringify(attempt.critique),
          });
        },
      );
      await ctx.runMutation(internal.state.complete, {
        runId,
        analysisJson: JSON.stringify(result.analysis),
        critiqueJson: JSON.stringify(result.critique),
      });
    } catch (error) {
      const message =
        error instanceof ProviderError
          ? error.message
          : error instanceof Error &&
              error.message ===
                "Critic rejected the recommendation after two analysis attempts"
            ? error.message
            : "Run failed validation or execution. No recommendation was accepted.";
      await ctx.runMutation(internal.runs.fail, { runId, error: message });
    }
    return null;
  },
});
export const configuration = action({
  args: {},
  returns: v.array(
    v.object({
      source: v.string(),
      configured: v.boolean(),
      missing: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await operator(ctx);
    return integrationConfiguration(process.env);
  },
});
