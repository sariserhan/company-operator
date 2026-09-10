import { it, expect, vi } from "vitest";
import { z } from "zod";
import { ReadOnlyHttp } from "../lib/integrations/http";
import { collectIntegrations } from "../lib/integrations";
import { collectStripe } from "../lib/integrations/stripe";
import { collectPosthog } from "../lib/integrations/posthog";
import { now } from "./fixtures";
it("never permits mutation requests or arbitrary external hosts", async () => {
  const fetcher = vi.fn();
  const http = new ReadOnlyHttp(fetcher);
  await expect(
    http.json("https://api.stripe.com/v1/subscriptions", {}, z.unknown(), {
      amount: 100,
    }),
  ).rejects.toThrow("policy");
  await expect(
    http.json("https://attacker.example", {}, z.unknown()),
  ).rejects.toThrow("policy");
  expect(fetcher).not.toHaveBeenCalled();
});
it("retries transient reads once and sanitizes errors", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("secret", { status: 503 }))
    .mockResolvedValueOnce(Response.json({ ok: true }));
  const http = new ReadOnlyHttp(fetcher);
  expect(
    await http.json(
      "https://api.github.com/repos/a/b",
      {},
      z.object({ ok: z.boolean() }),
    ),
  ).toEqual({ ok: true });
  expect(http.retries).toBe(1);
  const bad = new ReadOnlyHttp(
    vi.fn(async () => new Response("secret-token", { status: 401 })),
  );
  await expect(
    bad.json("https://api.github.com/repos/a/b", {}, z.unknown()),
  ).rejects.toThrow("HTTP 401");
});
it("integrations fail independently without fabricated values", async () => {
  const results = await collectIntegrations({}, "USD", now, vi.fn());
  expect(results).toHaveLength(5);
  expect(
    results.every((r) => r.status === "error" && r.metrics.length === 0),
  ).toBe(true);
});
it("paginates Stripe subscriptions and only issues GETs", async () => {
  const seen: string[] = [];
  const fetcher: typeof fetch = vi.fn(async (input, init) => {
    const url = new URL(String(input));
    seen.push(url.toString());
    expect(init?.method).toBe("GET");
    if (url.pathname.endsWith("subscriptions"))
      return Response.json({ data: [], has_more: false });
    if (url.pathname.endsWith("customers"))
      return Response.json(
        url.searchParams.has("starting_after")
          ? { data: [{ id: "c2" }], has_more: false }
          : { data: [{ id: "c1" }], has_more: true },
      );
    return Response.json({ data: [], has_more: false });
  });
  const result = await collectStripe(
    { STRIPE_READ_ONLY_KEY: "fixture" },
    new ReadOnlyHttp(fetcher),
    now,
    "USD",
  );
  expect(result.metrics.find((m) => m.metric === "customer_count")?.value).toBe(
    2,
  );
  expect(seen.some((u) => u.includes("starting_after=c1"))).toBe(true);
  expect(result.metrics.find((m) => m.metric === "mrr")?.value).toBe(0);
});
it("collects sequential signup cohort using query-only POST", async () => {
  const fetcher: typeof fetch = vi.fn(async (_input, init) => {
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    return Response.json({
      results: body.query.query.startsWith("SELECT uniqExact")
        ? [[12]]
        : body.query.query.startsWith("SELECT count()")
          ? [[38, 9]]
          : [
              ["registered", 38],
              ["installed", 9],
            ],
    });
  });
  const result = await collectPosthog(
    {
      POSTHOG_PERSONAL_API_KEY: "fixture",
      POSTHOG_PROJECT_ID: "1",
      POSTHOG_EVENT_MAP:
        '{"signup_completed":"registered","tracking_installed":"installed"}',
    },
    new ReadOnlyHttp(fetcher),
    now,
  );
  expect(
    result.metrics
      .filter((m) => m.metric === "tracking_installed_cohort")
      .map((m) => m.value),
  ).toEqual([9, 9]);
});
