import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { fixtureSnapshot, fixtureAnalysis, objective, now } from "./fixtures";
import { validateAnalysis } from "../lib/business/evaluator";
import { rankOpportunities } from "../lib/business/prioritization";
import { normalizeSnapshot } from "../lib/business/metrics";
import { analyzeCompany } from "../lib/business/analysis";
import { OpenAIProvider } from "../lib/ai/openai";
import { AnthropicProvider } from "../lib/ai/anthropic";
import type { ReasoningProvider, Usage } from "../lib/ai/provider";
import type { Subscription } from "../lib/integrations/stripe";
import { monthlyRecurringRevenue } from "../lib/integrations/stripe";
function subscription(
  amount: number,
  interval: "month" | "year",
  status = "active",
): Subscription {
  return {
    id: "sub",
    status,
    customer: "cus",
    created: 0,
    canceled_at: null,
    items: {
      data: [
        {
          quantity: 1,
          price: {
            id: "p",
            currency: "usd",
            unit_amount: amount,
            billing_scheme: "per_unit",
            recurring: { interval, interval_count: 1, usage_type: "licensed" },
          },
        },
      ],
    },
  };
}
describe("MRR", () => {
  it("normalizes annual plans and excludes trials/canceled subscriptions", () =>
    expect(
      monthlyRecurringRevenue(
        [
          subscription(12000, "year"),
          subscription(1900, "month"),
          subscription(9000, "month", "trialing"),
          subscription(9000, "month", "canceled"),
        ],
        "USD",
      ),
    ).toBe(29));
  it("counts quantities and scheduled-cancel active subscriptions", () => {
    const s = subscription(1900, "month");
    s.items.data[0].quantity = 3;
    s.canceled_at = 1;
    expect(monthlyRecurringRevenue([s], "USD")).toBe(57);
  });
  it("fails on mixed currencies, tiered pricing or truncated items", () => {
    const s = subscription(1900, "month");
    s.items.data[0].price.currency = "eur";
    expect(() => monthlyRecurringRevenue([s], "USD")).toThrow("Mixed-currency");
    s.items.data[0].price.currency = "usd";
    s.items.has_more = true;
    expect(() => monthlyRecurringRevenue([s], "USD")).toThrow("pagination");
  });
});
describe("evidence and normalization", () => {
  it("accepts grounded analysis", () =>
    expect(() =>
      validateAnalysis(fixtureAnalysis(), fixtureSnapshot()),
    ).not.toThrow());
  it("rejects invented references and baseline values", () => {
    const a = fixtureAnalysis();
    a.observations[0].evidence = ["imaginary"];
    expect(() => validateAnalysis(a, fixtureSnapshot())).toThrow("Unsupported");
    const b = fixtureAnalysis();
    b.recommendedExperiment.baseline = 0.9;
    expect(() => validateAnalysis(b, fixtureSnapshot())).toThrow("baseline");
  });
  it("rejects invalid hypothesis links and non-improving targets", () => {
    const a = fixtureAnalysis();
    a.hypotheses[0].observationIndexes = [42];
    expect(() => validateAnalysis(a, fixtureSnapshot())).toThrow("absent");
    const b = fixtureAnalysis();
    b.recommendedExperiment.target = 0.1;
    expect(() => validateAnalysis(b, fixtureSnapshot())).toThrow("improve");
  });
  it("keeps missing critical data unknown", () => {
    const s = normalizeSnapshot(objective, [], [], now);
    expect(s.objective.current).toBeNull();
    expect(s.metrics).toEqual([]);
  });
  it("calculates same-cohort activation only", () =>
    expect(
      fixtureSnapshot().metrics.find(
        (m) => m.metric === "tracking_install_completion_rate",
      )?.value,
    ).toBe(9 / 38));
  it("ranks using cost and effort", () => {
    const o = fixtureAnalysis().opportunities[0];
    expect(
      rankOpportunities([
        { ...o, title: "costly", estimatedCostUsd: 10000 },
        { ...o, title: "cheap" },
      ])[0].title,
    ).toBe("cheap");
  });
});
function staged(accept: boolean): ReasoningProvider {
  const a = fixtureAnalysis();
  return {
    provider: "openai",
    model: "fixture",
    generate: vi.fn(
      async <T>(
        stage: string,
        _instruction: string,
        _input: unknown,
        schema: z.ZodType<T>,
      ) =>
        schema.parse(
          stage === "observations"
            ? { observations: a.observations, missingInformation: [] }
            : stage === "diagnosis"
              ? {
                  executiveSummary: a.executiveSummary,
                  currentBottleneck: a.currentBottleneck,
                  hypotheses: a.hypotheses,
                  opportunities: a.opportunities,
                  assumptions: a.assumptions,
                }
              : stage === "experiment"
                ? a.recommendedExperiment
                : {
                    accepted: accept,
                    severity: accept ? "none" : "high",
                    issues: accept ? [] : ["Unsupported causation"],
                    suggestedRevision: accept ? null : "Revise diagnosis",
                  },
        ),
    ) as ReasoningProvider["generate"],
  };
}
it("executes four stages and accepts reviewed recommendation", async () => {
  const p = staged(true),
    audit = vi.fn();
  const result = await analyzeCompany(fixtureSnapshot(), p, [], audit);
  expect(result.critique.accepted).toBe(true);
  expect(p.generate).toHaveBeenCalledTimes(4);
  expect(audit).toHaveBeenCalledTimes(1);
});
it("stops after two rejected analysis attempts", async () => {
  const p = staged(false),
    audit = vi.fn();
  await expect(analyzeCompany(fixtureSnapshot(), p, [], audit)).rejects.toThrow(
    "two analysis attempts",
  );
  expect(p.generate).toHaveBeenCalledTimes(8);
  expect(audit).toHaveBeenCalledTimes(2);
});
it("retries malformed structured outputs once and records usage for both attempts", async () => {
  const usages: Usage[] = [];
  const fetcher = vi.fn(async () =>
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "not json" }],
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
  );
  const p = new OpenAIProvider(
    "fixture",
    { OPENAI_API_KEY: "fixture" },
    async (u) => {
      usages.push(u);
    },
    fetcher,
  );
  await expect(
    p.generate("test", "test", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow("twice");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(usages).toHaveLength(2);
  expect(usages[0].costUsd).toBeNull();
});
it("uses Anthropic strict JSON and configured cost rates", async () => {
  const usages: Usage[] = [];
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"ok":true}' }],
      usage: { input_tokens: 100, output_tokens: 20 },
    }),
  );
  const p = new AnthropicProvider(
    "fixture",
    {
      ANTHROPIC_API_KEY: "fixture",
      LLM_PRICING_MODEL: "anthropic/fixture",
      LLM_INPUT_USD_PER_MILLION: "2",
      LLM_OUTPUT_USD_PER_MILLION: "10",
    },
    async (u) => {
      usages.push(u);
    },
    fetcher,
  );
  expect(
    await p.generate("test", "test", {}, z.object({ ok: z.boolean() })),
  ).toEqual({ ok: true });
  expect(usages[0].costUsd).toBeCloseTo(0.0004);
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toHaveProperty(
    "output_config.format.type",
    "json_schema",
  );
});
