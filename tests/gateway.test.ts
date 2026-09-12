import { expect, it, vi } from "vitest";
import { z } from "zod";
import { GatewayProvider } from "../lib/ai/gateway";
import type { Usage } from "../lib/ai/provider";
const completion = (finish = "stop", cost: number | undefined = 0.012) => ({
  choices: [{ finish_reason: finish, message: { content: '{"ok":true}' } }],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 8,
    prompt_tokens_details: { cached_tokens: 25 },
    cost,
  },
});
it("uses gateway-only authentication and records gateway-reported cost", async () => {
  const usage: Usage[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer gateway-fixture",
    );
    expect(new Headers(init?.headers).has("x-api-key")).toBe(false);
    expect(init?.redirect).toBe("error");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("anthropic/claude-sonnet-4.6");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(JSON.stringify(body)).not.toContain("gateway-fixture");
    return Response.json(completion());
  });
  const provider = new GatewayProvider(
    "anthropic/claude-sonnet-4.6",
    { AI_GATEWAY_API_KEY: "gateway-fixture", ANTHROPIC_API_KEY: "not-used" },
    async (u) => {
      usage.push(u);
    },
    fetcher,
  );
  expect(
    await provider.generate("test", "test", {}, z.object({ ok: z.boolean() })),
  ).toEqual({ ok: true });
  expect(usage[0]).toMatchObject({
    costUsd: 0.012,
    inputTokens: 100,
    cachedInputTokens: 25,
    outputTokens: 8,
  });
});
it("rejects truncated output and accounts for both bounded attempts", async () => {
  const usage: Usage[] = [];
  const fetcher = vi.fn(async () => Response.json(completion("length")));
  const provider = new GatewayProvider(
    "openai/gpt-4.1",
    { AI_GATEWAY_API_KEY: "fixture" },
    async (u) => {
      usage.push(u);
    },
    fetcher,
  );
  await expect(
    provider.generate("test", "test", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow("failed twice");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(usage.map((u) => u.costUsd)).toEqual([0.012, 0.012]);
});
it("reports credit exhaustion safely without a paid retry", async () => {
  const fetcher = vi.fn(
    async () => new Response("sensitive-error", { status: 402 }),
  );
  const provider = new GatewayProvider(
    "openai/gpt-4.1",
    { AI_GATEWAY_API_KEY: "fixture" },
    vi.fn(),
    fetcher,
  );
  await expect(
    provider.generate("test", "test", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow("Vercel AI Gateway credit is exhausted");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not use a direct-provider key when the gateway key is missing", async () => {
  const fetcher = vi.fn();
  const provider = new GatewayProvider(
    "openai/gpt-4.1",
    { OPENAI_API_KEY: "fixture" },
    vi.fn(),
    fetcher,
  );
  await expect(
    provider.generate("test", "test", {}, z.object({ ok: z.boolean() })),
  ).rejects.toThrow("Missing AI_GATEWAY_API_KEY");
  expect(fetcher).not.toHaveBeenCalled();
});
it("repairs invalid evidence using specific feedback and the previous candidate", async () => {
  const bodies: { messages: { content: string }[] }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    const result = completion();
    result.choices[0].message.content = JSON.stringify({
      ok: bodies.length === 2,
    });
    return Response.json(result);
  });
  const provider = new GatewayProvider(
    "anthropic/claude-sonnet-4.6",
    { AI_GATEWAY_API_KEY: "fixture" },
    vi.fn(),
    fetcher,
  );
  const result = await provider.generate(
    "experiment",
    "test",
    { metric: "fixture" },
    z.object({ ok: z.boolean() }),
    (candidate) => {
      if (!candidate.ok)
        throw new Error(
          "Experiment baseline is not grounded in the named metric",
        );
    },
  );
  expect(result.ok).toBe(true);
  const retry = JSON.parse(bodies[1].messages.at(-1)!.content);
  expect(retry.originalInput).toEqual({ metric: "fixture" });
  expect(retry.previousOutput).toBe('{"ok":false}');
  expect(retry.validationFeedback).toBe(
    "Experiment baseline is not grounded in the named metric",
  );
});
it("does not expose arbitrary validator errors", async () => {
  const provider = new GatewayProvider(
    "anthropic/claude-sonnet-4.6",
    { AI_GATEWAY_API_KEY: "fixture" },
    vi.fn(),
    vi.fn(async () => Response.json(completion())),
  );
  await expect(
    provider.generate("test", "test", {}, z.object({ ok: z.boolean() }), () => {
      throw new Error("private-sensitive-value");
    }),
  ).rejects.toThrow("failed twice: Invalid JSON or response validation failed");
});
