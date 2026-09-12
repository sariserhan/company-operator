import { z } from "zod";
export type Fetcher = typeof fetch;
export class IntegrationError extends Error {}
export class ReadOnlyHttp {
  calls = 0;
  retries = 0;
  constructor(private fetcher: Fetcher = fetch) {}
  async json<T>(
    url: string,
    headers: Record<string, string>,
    schema: z.ZodType<T>,
    queryBody?: unknown,
  ): Promise<T> {
    const target = new URL(url);
    const readQuery =
      (target.hostname === "searchconsole.googleapis.com" &&
        target.pathname.endsWith("/searchAnalytics/query")) ||
      (["us.posthog.com", "eu.posthog.com", "app.posthog.com"].includes(
        target.hostname,
      ) &&
        /^\/api\/projects\/\d+\/query\/$/.test(target.pathname));
    const allowed = [
      "api.stripe.com",
      "api.github.com",
      "api.vercel.com",
      "searchconsole.googleapis.com",
      "us.posthog.com",
      "eu.posthog.com",
      "app.posthog.com",
    ];
    if (
      target.protocol !== "https:" ||
      target.username ||
      target.password ||
      !(
        allowed.includes(target.hostname) ||
        (["visitorping.com", "www.visitorping.com"].includes(target.hostname) &&
          target.pathname === "/api/operator/analytics" &&
          !target.port)
      ) ||
      (queryBody !== undefined && !readQuery)
    )
      throw new IntegrationError("Read-only request policy rejected endpoint");
    return this.request(
      url,
      headers,
      schema,
      queryBody === undefined ? undefined : JSON.stringify(queryBody),
      "application/json",
    );
  }
  // Credential exchange is separate from business-data requests: this exact
  // endpoint can only renew a Google OAuth token, never mutate business data.
  async refreshGoogleToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ) {
    const result = await this.request(
      "https://oauth2.googleapis.com/token",
      {},
      z.object({
        access_token: z.string().min(1),
        expires_in: z.number().positive(),
        token_type: z.literal("Bearer"),
      }),
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
      "application/x-www-form-urlencoded",
    );
    return result.access_token;
  }
  private async request<T>(
    url: string,
    headers: Record<string, string>,
    schema: z.ZodType<T>,
    body: string | undefined,
    contentType: string,
  ): Promise<T> {
    const target = new URL(url);
    for (let attempt = 0; attempt < 2; attempt++) {
      this.calls++;
      let response: Response;
      try {
        response = await this.fetcher(url, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            ...headers,
            ...(body === undefined ? {} : { "Content-Type": contentType }),
          },
          body,
          signal: AbortSignal.timeout(20_000),
          redirect: "error",
          cache: "no-store",
        });
      } catch {
        throw new IntegrationError(
          `Network request failed for ${target.hostname}`,
        );
      }
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt === 0
      ) {
        this.retries++;
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      if (!response.ok)
        throw new IntegrationError(
          `${target.hostname} returned HTTP ${response.status}`,
        );
      try {
        return schema.parse(await response.json());
      } catch {
        throw new IntegrationError(
          `${target.hostname} returned an unexpected response shape`,
        );
      }
    }
    throw new IntegrationError("Read request failed after retry");
  }
}
export function required(env: Record<string, string | undefined>, key: string) {
  const value = env[key];
  if (!value) throw new IntegrationError(`Missing configuration: ${key}`);
  return value;
}
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
