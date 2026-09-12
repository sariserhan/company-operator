import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { operator, ownedCompany } from "./access";
import { objectiveSchema } from "../lib/business/types";
import { objectiveFields, providerV } from "./schema";
export const current = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("companies"),
      name: v.string(),
      websiteUrl: v.string(),
      status: v.union(v.literal("active"), v.literal("paused")),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await operator(ctx);
    const c = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user))
      .first();
    return c
      ? { _id: c._id, name: c.name, websiteUrl: c.websiteUrl, status: c.status }
      : null;
  },
});
export const create = mutation({
  args: { websiteUrl: v.string() },
  returns: v.id("companies"),
  handler: async (ctx, args) => {
    const user = await operator(ctx);
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user))
      .first();
    if (existing) return existing._id;
    const url = new URL(args.websiteUrl);
    if (url.protocol !== "https:")
      throw new Error("Company website must use HTTPS");
    const now = Date.now(),
      companyId = await ctx.db.insert("companies", {
        ownerId: user,
        name: "VisitorPing",
        websiteUrl: url.toString(),
        status: "active",
        createdAt: now,
      });
    await ctx.db.insert("objectives", {
      companyId,
      name: "Reach $5,000 MRR",
      metric: "mrr",
      target: 5000,
      currency: "USD",
      direction: "increase",
      status: "active",
      priority: 1,
      createdAt: now,
    });
    await ctx.db.insert("settings", {
      companyId,
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4.1",
    });
    await ctx.db.insert("events", {
      companyId,
      type: "COMPANY_CREATED",
      payloadJson: "{}",
      timestamp: now,
    });
    return companyId;
  },
});
export const settings = query({
  args: { companyId: v.id("companies") },
  returns: v.object({
    objective: v.union(v.object(objectiveFields), v.null()),
    provider: providerV,
    model: v.string(),
  }),
  handler: async (ctx, { companyId }) => {
    await ownedCompany(ctx, companyId);
    const objective = await ctx.db
        .query("objectives")
        .withIndex("by_companyId_and_status", (q) =>
          q.eq("companyId", companyId).eq("status", "active"),
        )
        .first(),
      settings = await ctx.db
        .query("settings")
        .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
        .unique();
    return {
      objective: objective ? objectiveSchema.parse(objective) : null,
      provider: settings?.provider ?? "openai",
      model: settings?.model ?? "gpt-4.1",
    };
  },
});
export const updateSettings = mutation({
  args: {
    companyId: v.id("companies"),
    ...objectiveFields,
    provider: providerV,
    model: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownedCompany(ctx, args.companyId);
    const objective = objectiveSchema.parse(args);
    if (objective.currency !== "USD")
      throw new Error("V1 supports USD objectives");
    if (
      !(
        args.provider === "vercel_gateway"
          ? /^[a-zA-Z0-9._:-]+\/[a-zA-Z0-9._:-]+$/
          : /^[a-zA-Z0-9._:-]+$/
      ).test(args.model) ||
      args.model.length > 150
    )
      throw new Error("Invalid model ID");
    const old = await ctx.db
      .query("objectives")
      .withIndex("by_companyId_and_status", (q) =>
        q.eq("companyId", args.companyId).eq("status", "active"),
      )
      .first();
    if (old) await ctx.db.patch(old._id, { status: "paused" });
    await ctx.db.insert("objectives", {
      companyId: args.companyId,
      ...objective,
      status: "active",
      priority: 1,
      createdAt: Date.now(),
    });
    const s = await ctx.db
      .query("settings")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .unique();
    if (s)
      await ctx.db.patch(s._id, { provider: args.provider, model: args.model });
    await ctx.db.insert("events", {
      companyId: args.companyId,
      type: "SETTINGS_UPDATED",
      payloadJson: JSON.stringify({
        objective,
        provider: args.provider,
        model: args.model,
      }),
      timestamp: Date.now(),
    });
    return null;
  },
});
