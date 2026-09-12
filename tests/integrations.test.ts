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

import { collectSearchConsole } from "../lib/integrations/search-console";
import { collectVisitorping } from "../lib/integrations/visitorping";
import { integrationConfiguration } from "../lib/integrations";
import { windowPeriod } from "../lib/business/types";

it("renews Google once per collection and uses the new token on all reads", async () => {
  let renewals = 0,
    reads = 0;
  const fetcher: typeof fetch = vi.fn(async (url, init) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      renewals++;
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      const params = new URLSearchParams(String(init?.body));
      expect(params.get("grant_type")).toBe("refresh_token");
      expect(params.get("refresh_token")).toBe("refresh-fixture");
      return Response.json({
        access_token: "renewed",
        expires_in: 3600,
        token_type: "Bearer",
      });
    }
    reads++;
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer renewed",
    );
    return Response.json({
      rows: [{ clicks: 3, impressions: 600, ctr: 0.005, position: 82 }],
    });
  });
  const http = new ReadOnlyHttp(fetcher);
  await collectSearchConsole(
    {
      GOOGLE_ACCESS_TOKEN: "expired",
      GOOGLE_CLIENT_ID: "client",
      GOOGLE_CLIENT_SECRET: "secret",
      GOOGLE_REFRESH_TOKEN: "refresh-fixture",
      GOOGLE_SEARCH_CONSOLE_SITE: "sc-domain:visitorping.com",
    },
    http,
    now,
  );
  expect(renewals).toBe(1);
  expect(reads).toBe(6);
  expect(http.calls).toBe(7);
});
it("fails safely on incomplete or revoked Google renewal without leaking credentials", async () => {
  const env = {
    GOOGLE_ACCESS_TOKEN: "old",
    GOOGLE_CLIENT_ID: "client",
    GOOGLE_SEARCH_CONSOLE_SITE: "sc-domain:visitorping.com",
  };
  const fetcher = vi.fn(
    async () => new Response("sensitive-refresh-token", { status: 400 }),
  );
  await expect(
    collectSearchConsole(env, new ReadOnlyHttp(fetcher), now),
  ).rejects.toThrow("Incomplete Google renewal");
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    collectSearchConsole(
      {
        ...env,
        GOOGLE_CLIENT_SECRET: "secret",
        GOOGLE_REFRESH_TOKEN: "refresh",
      },
      new ReadOnlyHttp(fetcher),
      now,
    ),
  ).rejects.toThrow("oauth2.googleapis.com returned HTTP 400");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    integrationConfiguration(env).find((x) => x.source === "search_console")
      ?.configured,
  ).toBe(false);
});
it("does not expose OAuth exchange as an arbitrary POST capability", async () => {
  const fetcher = vi.fn();
  await expect(
    new ReadOnlyHttp(fetcher).json(
      "https://oauth2.googleapis.com/token",
      {},
      z.unknown(),
      {},
    ),
  ).rejects.toThrow("policy");
  expect(fetcher).not.toHaveBeenCalled();
});
function nativeResponse() {
  return {
    schemaVersion: 1,
    capturedAt: now,
    siteDomain: "visitorping.com",
    periods: [false, true].map((previous) => ({
      ...windowPeriod(now, 7, previous),
      websiteVisitors: 50,
      websiteSessions: 70,
      newWorkspaces: 10,
      activatedNewWorkspaces: 3,
      checkoutStartedWorkspaces: 2,
      subscriptionStartedWorkspaces: 1,
    })),
  };
}
it("collects native website traffic separately from workspace cohorts", async () => {
  const fetcher: typeof fetch = vi.fn(async (_url, init) => {
    expect(init?.method).toBe("GET");
    return Response.json(nativeResponse());
  });
  const result = await collectVisitorping(
    { VISITORPING_ANALYTICS_TOKEN: "fixture" },
    new ReadOnlyHttp(fetcher),
    now,
  );
  expect(result.metrics).toHaveLength(12);
  expect(
    result.metrics.find((m) => m.metric === "signup_completed_cohort")?.unit,
  ).toBe("workspaces");
  expect(result.metrics.every((m) => m.source === "visitorping")).toBe(true);
});
it("rejects native credential exfiltration, stale data, mismatched periods and impossible cohorts", async () => {
  const fetcher = vi.fn();
  await expect(
    collectVisitorping(
      {
        VISITORPING_ANALYTICS_TOKEN: "fixture",
        VISITORPING_ANALYTICS_URL:
          "https://api.github.com/api/operator/analytics",
      },
      new ReadOnlyHttp(fetcher),
      now,
    ),
  ).rejects.toThrow("Invalid VisitorPing");
  expect(fetcher).not.toHaveBeenCalled();
  const fixtures = [
    { ...nativeResponse(), capturedAt: now - 600_000 },
    {
      ...nativeResponse(),
      periods: [nativeResponse().periods[0], nativeResponse().periods[0]],
    },
    {
      ...nativeResponse(),
      periods: nativeResponse().periods.map((p) => ({
        ...p,
        activatedNewWorkspaces: 11,
      })),
    },
  ];
  for (const fixture of fixtures)
    await expect(
      collectVisitorping(
        { VISITORPING_ANALYTICS_TOKEN: "fixture" },
        new ReadOnlyHttp(vi.fn(async () => Response.json(fixture))),
        now,
      ),
    ).rejects.toThrow();
});
