import { z } from "zod";
import { DAY, makeMetric, type Env, type Metric } from "../business/types";
import { ReadOnlyHttp, required, bearer, IntegrationError } from "./http";
const price = z.object({
  id: z.string(),
  currency: z.string(),
  unit_amount: z.number().nullable(),
  unit_amount_decimal: z.string().nullable().optional(),
  billing_scheme: z.string(),
  recurring: z
    .object({
      interval: z.enum(["day", "week", "month", "year"]),
      interval_count: z.number().positive(),
      usage_type: z.string(),
    })
    .nullable(),
});
const subscription = z.object({
  id: z.string(),
  status: z.string(),
  customer: z.string(),
  created: z.number(),
  canceled_at: z.number().nullable(),
  ended_at: z.number().nullable().optional(),
  discounts: z.array(z.unknown()).optional(),
  items: z.object({
    data: z.array(
      z.object({
        quantity: z.number().optional(),
        price,
        discounts: z.array(z.unknown()).optional(),
      }),
    ),
    has_more: z.boolean().optional(),
  }),
});
export type Subscription = z.infer<typeof subscription>;
export function monthlyRecurringRevenue(
  subscriptions: Subscription[],
  currency: string,
) {
  let total = 0;
  for (const sub of subscriptions) {
    if (!["active", "past_due"].includes(sub.status)) continue;
    if (sub.items.has_more)
      throw new IntegrationError(
        "Subscription item pagination requires reconciliation; MRR unavailable",
      );
    for (const item of sub.items.data) {
      const p = item.price;
      if (!p.recurring || p.recurring.usage_type === "metered") continue;
      if (p.currency.toUpperCase() !== currency.toUpperCase())
        throw new IntegrationError(
          "Mixed-currency subscriptions require an explicit FX policy; MRR unavailable",
        );
      if (p.billing_scheme !== "per_unit" || p.unit_amount === null)
        throw new IntegrationError(
          "Tiered/custom subscription pricing requires reconciliation; MRR unavailable",
        );
      const divisor =
        { month: 1, year: 12, week: 12 / 52, day: 12 / 365 }[
          p.recurring.interval
        ] * p.recurring.interval_count;
      // Explicit gross-MRR policy excludes discounts, taxes, trials, unpaid/canceled, and metered usage.
      total +=
        ((Number(p.unit_amount_decimal ?? p.unit_amount) / 100) *
          (item.quantity ?? 1)) /
        divisor;
    }
  }
  return Math.round(total * 100) / 100;
}
async function list<T extends { id: string }>(
  http: ReadOnlyHttp,
  path: string,
  token: string,
  schema: z.ZodType<T>,
) {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = new URL(`https://api.stripe.com/v1/${path}`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("starting_after", cursor);
    const result = await http.json(
      url.toString(),
      { ...bearer(token), "Stripe-Version": "2025-02-24.acacia" },
      z.object({ data: z.array(schema), has_more: z.boolean() }),
    );
    rows.push(...result.data);
    if (!result.has_more) return rows;
    if (!result.data.length)
      throw new IntegrationError("Stripe returned an empty paginated page");
    cursor = result.data.at(-1)!.id;
  }
  throw new IntegrationError(
    "Stripe pagination limit reached; refusing partial totals",
  );
}
export async function collectStripe(
  env: Env,
  http: ReadOnlyHttp,
  now: number,
  currency: string,
) {
  if (currency !== "USD")
    throw new IntegrationError(
      "V1 revenue normalization supports USD objectives only",
    );
  const token = required(env, "STRIPE_READ_ONLY_KEY");
  const [subs, customers, invoices] = await Promise.all([
    list(http, "subscriptions?status=all", token, subscription),
    list(http, "customers", token, z.object({ id: z.string() })),
    list(
      http,
      "invoices?status=paid",
      token,
      z.object({
        id: z.string(),
        status: z.string().nullable(),
        currency: z.string(),
        amount_paid: z.number(),
        status_transitions: z.object({ paid_at: z.number().nullable() }),
      }),
    ),
  ]);
  const metrics: Metric[] = [];
  const add = (
    name: string,
    value: number,
    unit: string,
    start = now,
    end = now,
    description = name,
  ) =>
    metrics.push(
      makeMetric("stripe", name, value, unit, start, end, now, description),
    );
  add(
    "mrr",
    monthlyRecurringRevenue(subs, currency),
    currency,
    now,
    now,
    "Gross MRR: active + past_due licensed recurring prices, normalized monthly; excludes discounts, tax, trials, canceled/unpaid and metered usage. May differ from Stripe dashboard discount/activation settings.",
  );
  add(
    "active_subscriptions",
    subs.filter((s) => ["active", "past_due"].includes(s.status)).length,
    "subscriptions",
  );
  add(
    "active_customers",
    new Set(
      subs
        .filter((s) => ["active", "past_due"].includes(s.status))
        .map((s) => s.customer),
    ).size,
    "customers",
  );
  add("customer_count", customers.length, "customers");
  add(
    "trial_subscriptions",
    subs.filter((s) => s.status === "trialing").length,
    "subscriptions",
  );
  for (const days of [7, 28])
    for (const previous of [false, true]) {
      const end = Math.floor(now / DAY) * DAY - (previous ? days * DAY : 0),
        start = end - days * DAY;
      add(
        "new_subscriptions",
        subs.filter((s) => s.created * 1000 >= start && s.created * 1000 < end)
          .length,
        "subscriptions",
        start,
        end,
        "Subscriptions created, including trials; not necessarily new paying customers",
      );
      add(
        "cancellations",
        subs.filter(
          (s) =>
            s.ended_at != null &&
            s.ended_at * 1000 >= start &&
            s.ended_at * 1000 < end,
        ).length,
        "subscriptions",
        start,
        end,
        "Subscriptions actually ended during the period",
      );
      add(
        "revenue",
        invoices
          .filter(
            (i) =>
              i.status === "paid" &&
              i.currency.toUpperCase() === currency &&
              i.status_transitions.paid_at !== null &&
              i.status_transitions.paid_at * 1000 >= start &&
              i.status_transitions.paid_at * 1000 < end,
          )
          .reduce((sum, i) => sum + i.amount_paid / 100, 0),
        currency,
        start,
        end,
        "Gross paid invoice receipts by payment date; does not deduct refunds or tax",
      );
    }
  return {
    metrics,
    context: [
      `Prices observed on existing subscriptions only (the product/price catalog was not queried; an empty list does not imply missing prices or broken checkout): ${[...new Set(subs.flatMap((s) => s.items.data.map((i) => `${i.price.id}: ${i.price.unit_amount ?? "custom"} minor units ${i.price.currency}/${i.price.recurring?.interval_count} ${i.price.recurring?.interval}`)))].slice(0, 40).join("; ")}`,
    ],
    missingInformation: [
      "Stripe revenue represents gross paid invoice receipts, not net accounting revenue.",
      "Gross MRR excludes discounts; reconcile dashboard configuration before interpreting differences.",
    ],
  };
}
