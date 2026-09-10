import { z } from "zod";
import { JsonProvider, ProviderError } from "./provider";
export class AnthropicProvider extends JsonProvider {
  provider = "anthropic" as const;
  protected async request(
    _stage: string,
    instruction: string,
    input: unknown,
    schema: unknown,
  ) {
    if (!this.env.ANTHROPIC_API_KEY)
      throw new ProviderError("Missing ANTHROPIC_API_KEY");
    const raw = await this.post(
      "https://api.anthropic.com/v1/messages",
      {
        "x-api-key": this.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      {
        model: this.model,
        max_tokens: 6000,
        system: `${this.system}\n${instruction}`,
        messages: [{ role: "user", content: JSON.stringify(input) }],
        output_config: { format: { type: "json_schema", schema } },
      },
    );
    const r = z
      .object({
        stop_reason: z.string().nullable(),
        content: z.array(
          z.object({ type: z.string(), text: z.string().optional() }),
        ),
        usage: z.object({
          input_tokens: z.number(),
          output_tokens: z.number(),
          cache_read_input_tokens: z.number().optional(),
        }),
      })
      .parse(raw);
    const cached = r.usage.cache_read_input_tokens ?? 0;
    return {
      text:
        r.stop_reason === "end_turn"
          ? r.content
              .filter((c) => c.type === "text")
              .map((c) => c.text ?? "")
              .join("")
          : "",
      input: r.usage.input_tokens + cached,
      output: r.usage.output_tokens,
      cached,
    };
  }
}
