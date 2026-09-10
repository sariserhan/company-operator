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
  provider: "openai" | "anthropic";
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
  abstract provider: "openai" | "anthropic";
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
  ): Promise<{ text: string; input: number; output: number; cached: number }>;
  async generate<T>(
    stage: string,
    instruction: string,
    input: unknown,
    schema: z.ZodType<T>,
    validate?: (result: T) => void,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const started = Date.now();
      const response = await this.request(
        stage,
        instruction +
          (attempt === 2
            ? " Your prior output failed validation. Correct schema, evidence, references, units and baseline; return strict JSON."
            : ""),
        input,
        providerSchema(schema),
      );
      const inputRate = this.env.LLM_INPUT_USD_PER_MILLION,
        outputRate = this.env.LLM_OUTPUT_USD_PER_MILLION,
        cachedRate = this.env.LLM_CACHED_INPUT_USD_PER_MILLION;
      const rates = [inputRate, outputRate, cachedRate ?? inputRate].map((v) =>
        v === undefined || v.trim() === "" ? NaN : Number(v),
      );
      const costUsd =
        this.env.LLM_PRICING_MODEL === `${this.provider}/${this.model}` &&
        rates.every((v) => Number.isFinite(v) && v >= 0)
          ? ((response.input - response.cached) * rates[0] +
              response.cached * rates[2] +
              response.output * rates[1]) /
            1e6
          : null;
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
      } catch {
        if (attempt === 2)
          throw new ProviderError(
            `${stage}: structured output or evidence validation failed twice`,
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
        signal: AbortSignal.timeout(45_000),
        redirect: "error",
      });
    } catch {
      throw new ProviderError(`${this.provider}: request failed or timed out`);
    }
    if (!response.ok)
      throw new ProviderError(`${this.provider}: HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  }
  protected system = SYSTEM_PROMPT;
}
