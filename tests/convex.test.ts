import { convexTest } from "convex-test";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { fixtureSnapshot, fixtureAnalysis, objective, now } from "./fixtures";
const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => {
  vi.stubEnv("OPERATOR_EMAIL", "operator@example.test");
});
afterEach(() => vi.unstubAllEnvs());
function setup() {
  const t = convexTest(schema, modules);
  return {
    t,
    owner: t.withIdentity({ subject: "owner", email: "operator@example.test" }),
    stranger: t.withIdentity({
      subject: "stranger",
      email: "operator@example.test",
    }),
  };
}
async function runFixture(
  t: ReturnType<typeof convexTest>,
  owner: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
) {
  const companyId = await owner.mutation(api.companies.create, {
    websiteUrl: "https://example.test",
  });
  const runId = await t.run(async (ctx) =>
    ctx.db.insert("runs", {
      companyId,
      trigger: "manual",
      startedAt: now,
      status: "running",
      provider: "openai",
      model: "fixture",
      promptVersion: "1",
      analysisVersion: "1",
      objective,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      externalApiCostUsd: 0,
    }),
  );
  return { companyId, runId };
}
it("requires authentication and rejects access to another owner’s company", async () => {
  const { t, owner, stranger } = setup();
  await expect(t.query(api.companies.current, {})).rejects.toThrow(
    "Unauthorized",
  );
  const companyId = await owner.mutation(api.companies.create, {
    websiteUrl: "https://example.test",
  });
  await expect(
    stranger.query(api.companies.settings, { companyId }),
  ).rejects.toThrow("Company not found");
  await expect(
    stranger.mutation(api.runs.start, { companyId }),
  ).rejects.toThrow("Company not found");
});
it("persists a full reviewed run and evidence relationships atomically", async () => {
  const { t, owner } = setup(),
    { companyId, runId } = await runFixture(t, owner);
  await t.mutation(internal.runs.snapshot, {
    runId,
    snapshotJson: JSON.stringify(fixtureSnapshot()),
  });
  await t.mutation(internal.state.complete, {
    runId,
    analysisJson: JSON.stringify(fixtureAnalysis()),
    critiqueJson: JSON.stringify({
      accepted: true,
      severity: "none",
      issues: [],
      suggestedRevision: null,
    }),
  });
  const result = await t.run(async (ctx) => ({
    run: await ctx.db.get(runId),
    experiments: await ctx.db
      .query("experiments")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .take(10),
    observations: await ctx.db
      .query("observations")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .take(10),
    beliefs: await ctx.db
      .query("beliefs")
      .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
      .take(10),
  }));
  expect(result.run?.status).toBe("completed");
  expect(result.experiments[0].status).toBe("proposed");
  expect(result.observations[0].evidence[0].source).toBe("visitorping");
  expect(result.beliefs).toHaveLength(1);
  await expect(
    t.mutation(internal.runs.snapshot, {
      runId,
      snapshotJson: JSON.stringify(fixtureSnapshot()),
    }),
  ).rejects.toThrow();
});
it("rejects ungrounded persistence without partial writes", async () => {
  const { t, owner } = setup(),
    { runId } = await runFixture(t, owner);
  await t.mutation(internal.runs.snapshot, {
    runId,
    snapshotJson: JSON.stringify(fixtureSnapshot()),
  });
  const a = fixtureAnalysis();
  a.observations[0].evidence = ["invented"];
  await expect(
    t.mutation(internal.state.complete, {
      runId,
      analysisJson: JSON.stringify(a),
      critiqueJson: JSON.stringify({
        accepted: true,
        severity: "none",
        issues: [],
        suggestedRevision: null,
      }),
    }),
  ).rejects.toThrow("Unsupported");
  expect(
    await t.run((ctx) =>
      ctx.db
        .query("observations")
        .withIndex("by_runId", (q) => q.eq("runId", runId))
        .take(10),
    ),
  ).toHaveLength(0);
});
it("updates durable beliefs without endless duplicate entries and preserves history", async () => {
  const { t, owner } = setup();
  const first = await runFixture(t, owner);
  for (let i = 0; i < 2; i++) {
    const runId = i === 0 ? first.runId : (await runFixture(t, owner)).runId;
    await t.mutation(internal.runs.snapshot, {
      runId,
      snapshotJson: JSON.stringify(fixtureSnapshot()),
    });
    await t.mutation(internal.state.complete, {
      runId,
      analysisJson: JSON.stringify(fixtureAnalysis()),
      critiqueJson: JSON.stringify({
        accepted: true,
        severity: "none",
        issues: [],
        suggestedRevision: null,
      }),
    });
  }
  const beliefs = await t.run((ctx) =>
    ctx.db
      .query("beliefs")
      .withIndex("by_companyId", (q) => q.eq("companyId", first.companyId))
      .take(10),
  );
  expect(beliefs).toHaveLength(1);
  const events = await t.run((ctx) =>
    ctx.db
      .query("events")
      .withIndex("by_companyId", (q) => q.eq("companyId", first.companyId))
      .take(100),
  );
  expect(events.filter((e) => e.type === "BELIEF_UPDATED")).toHaveLength(2);
});
it("fails explicitly when critical Stripe data is absent and preserves missing-data snapshot", async () => {
  const { t, owner } = setup(),
    { runId } = await runFixture(t, owner);
  await t.action(internal.companyCycle.runCompanyCycle, { runId });
  const run = await t.run((ctx) => ctx.db.get(runId));
  expect(run?.status).toBe("failed");
  expect(run?.error).toContain("Stripe MRR unavailable");
  expect(run?.snapshotJson).toBeTruthy();
  expect(run?.analysisJson).toBeUndefined();
});
it("marks stalled runs failed", async () => {
  const { t, owner } = setup(),
    { runId } = await runFixture(t, owner);
  await t.mutation(internal.runs.timeout, { runId });
  expect((await t.run((ctx) => ctx.db.get(runId)))?.status).toBe("failed");
});

it.each(["openai", "vercel_gateway"] as const)(
  "runs collection through %s stages and critic into durable proposed state",
  async (providerName) => {
    const { t, owner } = setup(),
      { runId } = await runFixture(t, owner);
    vi.spyOn(Date, "now").mockReturnValue(now);
    vi.stubEnv("STRIPE_READ_ONLY_KEY", "fixture");
    vi.stubEnv("VISITORPING_ANALYTICS_TOKEN", "fixture");
    vi.stubEnv("OPENAI_API_KEY", "fixture");
    vi.stubEnv("AI_GATEWAY_API_KEY", "fixture");
    if (providerName === "vercel_gateway")
      await t.run((ctx) =>
        ctx.db.patch(runId, {
          provider: providerName,
          model: "anthropic/claude-sonnet-4.6",
        }),
      );
    const a = fixtureAnalysis();
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === "api.stripe.com") {
        expect(init?.method).toBe("GET");
        return Response.json({
          data: url.pathname.endsWith("subscriptions")
            ? [
                {
                  id: "s",
                  status: "active",
                  customer: "c",
                  created: 0,
                  canceled_at: null,
                  items: {
                    data: [
                      {
                        quantity: 12,
                        price: {
                          id: "p",
                          currency: "usd",
                          unit_amount: 1900,
                          billing_scheme: "per_unit",
                          recurring: {
                            interval: "month",
                            interval_count: 1,
                            usage_type: "licensed",
                          },
                        },
                      },
                    ],
                  },
                },
              ]
            : [],
          has_more: false,
        });
      }
      if (url.hostname === "visitorping.com")
        return Response.json({
          schemaVersion: 1,
          capturedAt: now,
          siteDomain: "visitorping.com",
          periods: [0, 1].map((previous) => ({
            start: now - (previous + 1) * 7 * 86400000,
            end: now - previous * 7 * 86400000,
            websiteVisitors: 100,
            websiteSessions: 120,
            newWorkspaces: 38,
            activatedNewWorkspaces: 9,
            checkoutStartedWorkspaces: 2,
            subscriptionStartedWorkspaces: 1,
          })),
        });
      const body = JSON.parse(String(init?.body));
      expect(url.href).toBe(
        providerName === "vercel_gateway"
          ? "https://ai-gateway.vercel.sh/v1/chat/completions"
          : "https://api.openai.com/v1/responses",
      );
      const stage =
        providerName === "vercel_gateway"
          ? body.response_format.json_schema.name
          : body.text.format.name;
      const result =
        stage === "observations"
          ? { observations: a.observations, missingInformation: [] }
          : stage === "diagnosis"
            ? a
            : stage === "experiment"
              ? a.recommendedExperiment
              : {
                  accepted: true,
                  severity: "none",
                  issues: [],
                  suggestedRevision: null,
                };
      if (providerName === "vercel_gateway")
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(result) },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 20, cost: 0.02 },
        });
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(result) }],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 20 },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    try {
      await t.action(internal.companyCycle.runCompanyCycle, { runId });
      const run = await t.run((ctx) => ctx.db.get(runId));
      expect(run?.status).toBe("completed");
      expect(run?.inputTokens).toBe(400);
      if (providerName === "vercel_gateway")
        expect(run?.costUsd).toBeCloseTo(0.08);
      expect(run?.analysisJson).toContain("Test simplified installation");
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  },
);

it("accepts gateway provider/model IDs while rejecting malformed IDs", async () => {
  const { owner } = setup();
  const companyId = await owner.mutation(api.companies.create, {
    websiteUrl: "https://visitorping.com",
  });
  await owner.mutation(api.companies.updateSettings, {
    companyId,
    ...objective,
    provider: "vercel_gateway",
    model: "anthropic/claude-sonnet-4.6",
  });
  expect(
    await owner.query(api.companies.settings, { companyId }),
  ).toMatchObject({
    provider: "vercel_gateway",
    model: "anthropic/claude-sonnet-4.6",
  });
  await expect(
    owner.mutation(api.companies.updateSettings, {
      companyId,
      ...objective,
      provider: "vercel_gateway",
      model: "https://attacker.example/model",
    }),
  ).rejects.toThrow("Invalid model ID");
});
it("paginates run summaries through populated and empty pages without leaking run internals", async () => {
  const { t, owner, stranger } = setup();
  const { companyId, runId } = await runFixture(t, owner);
  const secondId = await t.run(async (ctx) => {
    const original = (await ctx.db.get(runId))!;
    const { _id, _creationTime, ...fields } = original;
    void _id;
    void _creationTime;
    return ctx.db.insert("runs", {
      ...fields,
      snapshotJson: "private snapshot",
    });
  });
  const first = await owner.query(api.runs.list, {
    companyId,
    paginationOpts: { numItems: 1, cursor: null },
  });
  expect(first.page).toHaveLength(1);
  expect(first.page[0]._id).toBe(secondId);
  expect(first.page[0]).not.toHaveProperty("snapshotJson");
  const second = await owner.query(api.runs.list, {
    companyId,
    paginationOpts: { numItems: 1, cursor: first.continueCursor },
  });
  expect(second.page.map((r) => r._id)).toEqual([runId]);
  const empty = await owner.query(api.runs.list, {
    companyId,
    paginationOpts: { numItems: 1, cursor: second.continueCursor },
  });
  expect(empty.page).toEqual([]);
  expect(empty.isDone).toBe(true);
  await expect(
    stranger.query(api.runs.list, {
      companyId,
      paginationOpts: { numItems: 1, cursor: null },
    }),
  ).rejects.toThrow("Company not found");
});
it("returns unavailable for another owner's or deleted run without exposing its details", async () => {
  const { t, owner, stranger } = setup();
  const { runId } = await runFixture(t, owner);
  expect(
    JSON.parse((await owner.query(api.runs.detail, { runId }))!).run._id,
  ).toBe(runId);
  expect(await stranger.query(api.runs.detail, { runId })).toBeNull();
  await expect(t.query(api.runs.detail, { runId })).rejects.toThrow(
    "Unauthorized",
  );
  await t.run((ctx) => ctx.db.delete(runId));
  expect(await owner.query(api.runs.detail, { runId })).toBeNull();
});
