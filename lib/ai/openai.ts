import { z } from "zod";
import { JsonProvider, ProviderError } from "./provider";
export class OpenAIProvider extends JsonProvider {
  provider = "openai" as const;
  protected async request(
    stage: string,
    instruction: string,
    input: unknown,
    schema: unknown,
  ) {
    if (!this.env.OPENAI_API_KEY)
      throw new ProviderError("Missing OPENAI_API_KEY");
    const raw = await this.post(
      "https://api.openai.com/v1/responses",
      { Authorization: `Bearer ${this.env.OPENAI_API_KEY}` },
      {
        model: this.model,
        store: false,
        max_output_tokens: 6000,
        instructions: `${this.system}\n${instruction}`,
        input: JSON.stringify(input),
        text: {
          format: {
            type: "json_schema",
            name: stage.replaceAll(/[^a-z_]/g, "_"),
            strict: true,
            schema,
          },
        },
      },
    );
    const r = z
      .object({
        status: z.string(),
        output: z.array(
          z.object({
            type: z.string(),
            content: z
              .array(
                z.object({ type: z.string(), text: z.string().optional() }),
              )
              .optional(),
          }),
        ),
        usage: z.object({
          input_tokens: z.number(),
          output_tokens: z.number(),
          input_tokens_details: z
            .object({ cached_tokens: z.number() })
            .optional(),
        }),
      })
      .parse(raw);
    const text = r.output
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("");
    // Incomplete/refused output also goes through the bounded validation retry and usage accounting.
    return {
      text: r.status === "completed" ? text : "",
      input: r.usage.input_tokens,
      output: r.usage.output_tokens,
      cached: r.usage.input_tokens_details?.cached_tokens ?? 0,
    };
  }
}
