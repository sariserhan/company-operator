import { z } from "zod";
import { SYSTEM_PROMPT } from "./prompts";
import type { Env } from "../business/types";
export type Usage = {
  stage: string;
  attempt: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  durationMs: number;
  costUsd: number | null;
};
export interface ReasoningProvider {
  provider: "openai" | "anthropic" | "vercel_gateway";
  model: string;
  generate<T>(
    stage: string,
    instruction: string,
    input: unknown,
    schema: z.ZodType<T>,
    validate?: (result: T) => void,
  ): Promise<T>;
}
export type UsageSink = (usage: Usage) => Promise<void>;
export class ProviderError extends Error {}
// Only known validator messages may appear in stored errors or retry instructions.
function validationFeedback(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues
      .map((issue) => {
        const bound =
          "maximum" in issue
            ? ` maximum=${issue.maximum}`
            : "minimum" in issue
              ? ` minimum=${issue.minimum}`
              : "";
        return `Schema constraint ${issue.code}${bound}`;
      })
      .join("; ");
  const known = [
    "Invalid diagnosis references",
    "Experiment baselineEvidence must exactly match a snapshot metric key",
    "Experiment successMetric must exactly match the metric field, without source prefixes, units or labels",
    "Experiment baseline must equal the selected metric value without rounding or conversion",
    "Hypothesis references an absent observation",
    "Opportunity references an absent hypothesis",
    "Experiment references an absent hypothesis",
    "Experiment baseline is not grounded in the named metric",
    "Unknown baseline cannot have evidence",
    "Experiment target does not improve its baseline",
    "Experiment must test the highest-ranked opportunity",
  ];
  if (error instanceof Error) {
    if (known.includes(error.message)) return error.message;
    if (error.message.startsWith("Unsupported evidence reference:"))
      return "Evidence must use exact metric keys from the snapshot";
  }
  return "Invalid JSON or response validation failed";
}
function providerSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<
    string,
    unknown
  >;
  // Provider subsets vary. Keep structural strictness; enforce numeric/string/array bounds in Zod after generation.
  const strip = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(strip)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(
                ([k]) =>
                  ![
                    "$schema",
                    "minimum",
                    "maximum",
                    "minLength",
                    "maxLength",
                    "minItems",
                    "maxItems",
                  ].includes(k),
              )
              .map(([k, v]) => [k, strip(v)]),
          )
        : value;
  return strip(json);
}
export abstract class JsonProvider implements ReasoningProvider {
  protected requestTimeoutMs = 45_000;
  abstract provider: "openai" | "anthropic" | "vercel_gateway";
  constructor(
    public model: string,
    protected env: Env,
    protected onUsage: UsageSink,
    protected fetcher: typeof fetch = fetch,
  ) {}
  protected abstract request(
    stage: string,
    instruction: string,
    input: unknown,
    schema: unknown,
  ): Promise<{
    text: string;
    input: number;
    output: number;
    cached: number;
    costUsd?: number;
  }>;
  async generate<T>(
    stage: string,
    instruction: string,
    input: unknown,
    schema: z.ZodType<T>,
    validate?: (result: T) => void,
  ): Promise<T> {
    let repair:
      { previousOutput: string; validationFeedback: string } | undefined;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const started = Date.now();
      const response = await this.request(
        stage,
        instruction +
          (attempt === 2
            ? " Your prior output failed validation. Correct schema, evidence, references, units and baseline; return strict JSON."
            : ""),
        repair ? { originalInput: input, ...repair } : input,
        providerSchema(schema),
      );
      const inputRate = this.env.LLM_INPUT_USD_PER_MILLION,
        outputRate = this.env.LLM_OUTPUT_USD_PER_MILLION,
        cachedRate = this.env.LLM_CACHED_INPUT_USD_PER_MILLION;
      const rates = [inputRate, outputRate, cachedRate ?? inputRate].map((v) =>
        v === undefined || v.trim() === "" ? NaN : Number(v),
      );
      const costUsd =
        response.costUsd ??
        (this.env.LLM_PRICING_MODEL === `${this.provider}/${this.model}` &&
        rates.every((v) => Number.isFinite(v) && v >= 0)
          ? ((response.input - response.cached) * rates[0] +
              response.cached * rates[2] +
              response.output * rates[1]) /
            1e6
          : null);
      await this.onUsage({
        stage,
        attempt,
        inputTokens: response.input,
        outputTokens: response.output,
        cachedInputTokens: response.cached,
        durationMs: Date.now() - started,
        costUsd,
      });
      try {
        const result = schema.parse(JSON.parse(response.text));
        validate?.(result);
        return result;
      } catch (error) {
        const feedback = validationFeedback(error);
        repair = {
          previousOutput: response.text,
          validationFeedback: feedback,
        };
        if (attempt === 2)
          throw new ProviderError(
            `${stage}: structured output or evidence validation failed twice: ${feedback}`,
          );
      }
    }
    throw new ProviderError("Structured response unavailable");
  }
  protected async post(
    url: string,
    headers: Record<string, string>,
    body: unknown,
  ) {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
        redirect: "error",
      });
    } catch {
      throw new ProviderError(`${this.provider}: request failed or timed out`);
    }
    if (!response.ok) {
      if (this.provider === "vercel_gateway" && response.status === 402)
        throw new ProviderError(
          "Vercel AI Gateway credit is exhausted. Add gateway credit, then run again.",
        );
      // Inspect known codes only; raw provider errors may echo sensitive input.
      if (this.provider === "openai" && response.status === 429) {
        const error = await response.json().catch(() => null);
        if (
          error?.error?.code === "credit_balance_exhausted" ||
          error?.error?.code === "insufficient_quota" ||
          error?.error?.type === "insufficient_quota"
        )
          throw new ProviderError(
            "OpenAI API credit or quota is exhausted. Add API credit or use a funded project key, then run again.",
          );
      }
      throw new ProviderError(`${this.provider}: HTTP ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  }
  protected system = SYSTEM_PROMPT;
}
