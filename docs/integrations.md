# Finish the live integrations

## Local configuration and authentication

The operator runs on local anonymous Convex `anonymous-agent`. Save credentials in `.env.local`, then run `npm run env:sync` from this project on the Linux server. The script checks the local target, transfers only known nonempty settings, and verifies values without printing them. Incomplete Google renewal triples are skipped until all three values are present, preserving the working temporary-token setup. Blank fields do not erase an existing backend setting; remove obsolete values explicitly with the Convex CLI if needed.

Better Auth trusts `http://localhost:3000` and `http://localhost:4000` when SITE_URL uses a local localhost origin. Other production origins are not implicitly trusted. Set SITE_URL to the browser origin you normally use for absolute links. For Mac port 4000 forwarded to Linux port 3000, use `ssh -N -L 4000:localhost:3000 -L 3210:localhost:3210 headless`; omit duplicated forwards if the SSH host entry already defines them. For matching ports use the existing `docs/ssh-config.example`.

## Google Search Console renewal

The temporary Playground access token works, but cannot renew itself. The renewal implementation exchanges a refresh token at Google's fixed token endpoint once per collection, then uses the returned access token for all Search Console reads. No OAuth secrets or access tokens go into snapshots, logs, or the browser. Partial renewal configuration fails explicitly; a revoked refresh token is not hidden by a fallback.

1. In your Google Cloud project, enable Search Console API and create an OAuth client of type **Web application**. Configure the consent screen and grant access to your Google account as appropriate.
2. Set the authorized redirect URI to `https://developers.google.com/oauthplayground`.
3. Open [OAuth Playground](https://developers.google.com/oauthplayground/), click its gear, enable **Use your own OAuth credentials**, and enter that client's ID and secret. Keep access type **Offline**.
4. Authorize scope `https://www.googleapis.com/auth/webmasters.readonly` using the account with access to VisitorPing. Exchange the authorization code for tokens.
5. Save **that client's** values and the returned **Refresh token** in `.env.local` (never in chat):

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_SEARCH_CONSOLE_SITE=sc-domain:visitorping.com
```

6. Run `npm run env:sync`. All three renewal values must belong to the same authorization. A refresh token issued for Playground's default client cannot be paired with your own client. Default Playground tokens are temporary; follow the own-client setup for ongoing use. Google consent/testing policies and revoked grants can still require reauthorization.

[Google's official offline-access flow](https://developers.google.com/identity/protocols/oauth2/web-server#offline).

## VisitorPing native analytics

The actual VisitorPing source has no PostHog integration. Its native tracker data and activation milestone ledger provide the evidence. The active operator collector now uses `GET https://visitorping.com/api/operator/analytics`; old PostHog source values remain supported when reading historical snapshots.

The endpoint is deployed to VisitorPing production. Matching source is committed and pushed to VisitorPing GitHub `main` as `a40254a`:

- `apps/web/lib/operator-analytics.ts`: parameterized SELECT aggregates only.
- `apps/web/app/api/operator/analytics/route.ts`: dedicated bearer-token authentication, fixed marketing-site scope, bounded reporting dates, no raw database errors, no response caching.
- `apps/web/app/api/operator/analytics/route.test.ts`: authorization and request-boundary tests.

These server-only variables are configured on the VisitorPing production Vercel project:

```dotenv
OPERATOR_ANALYTICS_TOKEN=<random secret of at least 32 characters>
OPERATOR_ANALYTICS_SITE_KEY=<site key for visitorping.com itself>
```

A matching random token is configured in Vercel production and the local operator backend. Use the same token in Company Operator as `VISITORPING_ANALYTICS_TOKEN`, then run `npm run env:sync`. Production collection was verified on 2026-09-10: 12 valid metrics; missing or incorrect service tokens return 401. No existing VisitorPing browser session or production database password is copied to Company Operator.

The endpoint returns two complete seven-day UTC periods: marketing-site visitors/sessions, new workspaces, new-workspace tracking verification cohort, first checkout milestones, and first subscription milestones. It rejects site keys for unrelated customer domains. Workspaces include internal/test workspaces; deleted records and telemetry gaps are not reconstructed. Traffic includes all stored bot classifications. No cross-population visitor-to-workspace conversion rate is derived. Pricing views, signup starts and product retention remain unknown.

## OpenAI and the first run

The live run collected Stripe, GitHub, Vercel and Search Console successfully. OpenAI returned `insufficient_quota` / `credit_balance_exhausted` before generating output. Add API credit to the key's project or provide a key from a funded project, sync it, then click **Run analysis**. A ChatGPT subscription is separate from API billing.
