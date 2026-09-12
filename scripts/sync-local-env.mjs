import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { ConvexHttpClient } from "convex/browser";

// Deliberately restricted to this project's anonymous local backend.
// Never pass secrets on the command line or print environment values.
try {
  const env = parseEnv(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8"),
  );
  const config = JSON.parse(
    readFileSync(
      new URL("../.convex/local/default/config.json", import.meta.url),
      "utf8",
    ),
  );
  const expectedUrl = `http://127.0.0.1:${config.ports.cloud}`;
  if (
    env.CONVEX_DEPLOYMENT !== `anonymous:${config.deploymentName}` ||
    env.NEXT_PUBLIC_CONVEX_URL !== expectedUrl ||
    env.CONVEX_DEPLOY_KEY ||
    process.env.CONVEX_DEPLOY_KEY
  )
    throw new Error(
      "Local deployment settings do not agree. No environment values were changed.",
    );
  if (
    env.SITE_URL &&
    !["http://localhost:3000", "http://localhost:4000"].includes(env.SITE_URL)
  )
    throw new Error(
      "Local SITE_URL must use localhost:3000 or localhost:4000.",
    );
  console.log(
    `target: local-anonymous (${config.deploymentName}, ${expectedUrl})`,
  );
  const keys = [
    "SITE_URL",
    "BETTER_AUTH_SECRET",
    "OPERATOR_EMAIL",
    "ALLOW_SIGNUP",
    "STRIPE_READ_ONLY_KEY",
    "GITHUB_READ_ONLY_TOKEN",
    "GITHUB_REPOSITORY",
    "VERCEL_READ_ONLY_TOKEN",
    "VERCEL_PROJECT_ID",
    "VERCEL_TEAM_ID",
    "GOOGLE_ACCESS_TOKEN",
    "GOOGLE_SEARCH_CONSOLE_SITE",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "VISITORPING_ANALYTICS_TOKEN",
    "VISITORPING_ANALYTICS_URL",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "AI_GATEWAY_API_KEY",
    "OPENAI_MODEL",
    "LLM_PRICING_MODEL",
    "LLM_INPUT_USD_PER_MILLION",
    "LLM_OUTPUT_USD_PER_MILLION",
    "LLM_CACHED_INPUT_USD_PER_MILLION",
  ];
  const renewal = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
  ];
  const incompleteRenewal =
    renewal.some((key) => env[key]?.trim()) &&
    !renewal.every((key) => env[key]?.trim());
  if (incompleteRenewal)
    console.log(
      `Skipped incomplete Google renewal settings; still needed: ${renewal.filter((key) => !env[key]?.trim()).join(", ")}. Existing backend Google configuration is unchanged except any supplied temporary access token.`,
    );
  const changes = keys
    .filter(
      (key) =>
        env[key]?.trim() && !(incompleteRenewal && renewal.includes(key)),
    )
    .map((name) => ({ name, value: env[name] }));
  const response = await fetch(
    `${expectedUrl}/api/update_environment_variables`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Convex ${config.adminKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ changes }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Local environment update failed (HTTP ${response.status}).`,
    );
  const client = new ConvexHttpClient(expectedUrl);
  client.setAdminAuth(config.adminKey);
  const actual = await client.query(
    "_system/cli/queryEnvironmentVariables",
    {},
  );
  if (
    !changes.every(({ name, value }) =>
      actual.some((item) => item.name === name && item.value === value),
    )
  )
    throw new Error("Environment verification failed.");
  console.log(
    `Verified ${changes.length} settings: ${changes.map(({ name }) => name).join(", ")}`,
  );
  console.log("Blank or absent settings were left unchanged on the backend.");
} catch (error) {
  // Only our static messages are safe to expose; networking errors can contain request details.
  const message = error instanceof Error ? error.message : "";
  console.error(
    /^(Local |Environment verification failed)/.test(message)
      ? message
      : "Could not sync local configuration. Check the local backend and configuration files.",
  );
  process.exitCode = 1;
}
