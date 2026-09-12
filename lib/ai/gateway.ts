import { z } from "zod";
import { JsonProvider, ProviderError } from "./provider";

export class GatewayProvider extends JsonProvider {
  provider = "vercel_gateway" as const;
  protected requestTimeoutMs = 120_000;
  protected async request(
    stage: string,
    instruction: string,
    input: unknown,
    schema: unknown,
  ) {
    if (!this.env.AI_GATEWAY_API_KEY)
      throw new ProviderError("Missing AI_GATEWAY_API_KEY");
    const raw = await this.post(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        Authorization: `Bearer ${this.env.AI_GATEWAY_API_KEY}`,
      },
      {
        model: this.model,
        max_tokens: 6000,
        stream: false,
        messages: [
          { role: "system", content: `${this.system}\n${instruction}` },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: stage.replaceAll(/[^a-z_]/g, "_"),
            strict: true,
            schema,
          },
        },
      },
    );
    const result = z
      .object({
        choices: z
          .array(
            z.object({
              finish_reason: z.string().nullable(),
              message: z.object({
                content: z.string().nullable(),
                refusal: z.string().nullable().optional(),
              }),
            }),
          )
          .min(1),
        usage: z.object({
          prompt_tokens: z.number().int().nonnegative(),
          completion_tokens: z.number().int().nonnegative(),
          prompt_tokens_details: z
            .object({
              cached_tokens: z.number().int().nonnegative().optional(),
            })
            .optional(),
          cost: z.number().finite().nonnegative().optional(),
        }),
      })
      .parse(raw);
    const choice = result.choices[0];
    return {
      text:
        choice.finish_reason === "stop" && !choice.message.refusal
          ? (choice.message.content ?? "")
          : "",
      input: result.usage.prompt_tokens,
      output: result.usage.completion_tokens,
      cached: result.usage.prompt_tokens_details?.cached_tokens ?? 0,
      costUsd: result.usage.cost,
    };
  }
}
