# Company Operator

A read-only business operating loop for VisitorPing: collect real company data, identify the constraint, rank hypotheses and opportunities, propose one measurable experiment, retain the evidence and critic review, then stop.

Next.js + TypeScript + Tailwind + shadcn/ui, Convex state and scheduling, Better Auth with the Convex adapter. OpenAI and Anthropic implement the same strict JSON provider interface. No Clerk.

## Run locally

```sh
npm ci
# Keep this terminal running. --once validates/pushes, then stops the local backend.
CONVEX_AGENT_MODE=anonymous npx convex dev
# In another terminal:
npm run dev
```

Convex writes its two public connection URLs to `.env.local`. Open http://localhost:3000. A cloud Convex development deployment can be used instead with `npx convex dev`. No cloud deployment or Vercel publishing is required for local operation.

## Mac browser with a headless Linux server

Keep the browser URL and authentication origin identical: `http://localhost:3000`.
On your **Mac**, add the options from [docs/ssh-config.example](docs/ssh-config.example)
inside your existing `Host headless` entry in `~/.ssh/config`. Preserve its actual
`HostName`, `User` and key settings. Replace an existing 4000-to-3000 forwarding
rule; do not duplicate the same forward.

```sshconfig
Host headless
    LocalForward localhost:3000 127.0.0.1:3000
    LocalForward 127.0.0.1:3210 127.0.0.1:3210
    ExitOnForwardFailure yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Each time, connect from the Mac with `ssh headless`. This opens your normal remote
shell and the two tunnels. Keep this connection open. An additional SSH terminal
can use `ssh -o ClearAllForwardings=yes headless` to avoid trying to bind the same
local ports twice. Alternatively, use `ssh -N headless` as a dedicated tunnel and
open your working SSH sessions with `ClearAllForwardings=yes`.

On Linux, run `npx convex dev` and `npm run dev` in separate terminals as above.
Then open **http://localhost:3000 on the Mac**. Forward 3210 too: the browser uses
it for Convex's HTTP/WebSocket connection. Port 3211 remains server-local because
Next.js proxies the authentication requests to it.

Keep these settings:

- Convex backend environment: `SITE_URL=http://localhost:3000`.
- Linux `.env.local`: `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` and
  `NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211`.

If a forwarded port is occupied, SSH fails instead of silently leaving the tunnel
unavailable. Stop the old tunnel or the process occupying the Mac port. If Next.js
reports a port other than 3000, resolve that conflict before continuing. Reconnect
SSH after a dropped connection; keepalives detect failure but do not reconnect.
These settings establish tunnels, not the app processes themselves.

The Mac SSH configuration cannot be installed from this Linux workspace; apply
that one-time edit on the Mac. See the [OpenSSH configuration reference](https://man.openbsd.org/ssh_config)
for the forwarding and keepalive options.

## Authentication

Set these variables on the **Convex backend**, using `npx convex env set NAME VALUE`:

- `BETTER_AUTH_SECRET`: a random secret with at least 32 bytes.
- `SITE_URL`: `http://localhost:3000` locally; exact application origin in a hosted environment.
- `OPERATOR_EMAIL`: the only email allowed to register/access the workspace.
- `ALLOW_SIGNUP`: temporarily `true` on a private/local instance to create that account, then `false`.

Create the account through the sign-in screen with a password of at least 12 characters. Registration has no email delivery or verification flow in V1, so complete bootstrap privately before exposing the service. Ownership uses the authenticated subject, not a browser-provided user ID. Every public data function checks authentication and company ownership. The initial business and $5,000 MRR objective are created as persisted records after sign-in; the website URL is supplied by the operator.

The frontend uses Convex's typed `ConvexProviderWithAuth` bridge with Better Auth's session/token endpoints. This avoids an incompatible React wrapper type in adapter 0.12.5 while retaining Better Auth for sessions, credentials and Convex JWT issuance.

## Company integrations

All secrets belong in the Convex environment. `.env.example` lists names; setting them only in Next.js `.env.local` does not configure the backend.

| Source         | Variables                                                                                      | Scope and behavior                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe         | `STRIPE_READ_ONLY_KEY`                                                                         | Restricted read permissions for Customers, Subscriptions, Prices, Invoices. No mutation API.                                                                                                               |
| PostHog        | `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_EVENT_MAP`, optional `POSTHOG_HOST` | Structured HogQL queries. Hosts: `https://us.posthog.com`, `https://eu.posthog.com`, `https://app.posthog.com`. Map your actual event names.                                                               |
| Search Console | `GOOGLE_ACCESS_TOKEN`, `GOOGLE_SEARCH_CONSOLE_SITE`                                            | OAuth scope `https://www.googleapis.com/auth/webmasters.readonly`. Site URL must exactly match the property, including `sc-domain:` when appropriate. Refresh the access token externally when it expires. |
| GitHub         | `GITHUB_READ_ONLY_TOKEN`, `GITHUB_REPOSITORY`                                                  | `owner/repo`; fine-grained Contents, Metadata, Issues and Pull Requests read permissions.                                                                                                                  |
| Vercel         | `VERCEL_READ_ONLY_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`                       | Minimum available token scope; deployment GET endpoints only.                                                                                                                                              |

PostHog mapping keys: `signup_started`, `signup_completed`, `tracking_installed`, `pricing_page_views`, `trial_started`, `paid_conversion`, and `activation_event` for weekly retention. Values must match your actual event taxonomy. `$pageview` is used for visitors. Event totals count distinct people, sessions count session IDs, installation rate uses the same signup cohort with installation following signup inside the observation window. Recent users have less follow-up time; weekly activity retention is not subscription retention.

Stripe gross MRR includes active/past-due licensed recurring prices, normalized monthly by quantity and billing interval; excludes trials, canceled/unpaid subscriptions, metered usage, taxes and discounts. This explicitly differs from some Stripe dashboard policies. USD only in V1. Mixed currencies, tiered/custom pricing, incomplete subscription items and pagination caps fail explicitly. Revenue is gross paid invoice receipts by payment date, before refunds/tax adjustment. No payment-card details are expanded or persisted.

Search Console uses final web data with a three-day delay and Pacific calendar date labels, comparing 28 days against the preceding 28 days. Top-20 query/page samples are identified as samples; an absent sample is unknown, not zero. GitHub PR/issue/README/structure views are bounded samples. Vercel and Stripe totals paginate or fail rather than silently truncate. Read requests retry 429/5xx once. Optional integration failure is retained as missing information; unavailable Stripe MRR fails the run before model calls.

## Reasoning and costs

Configure `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` on Convex. Select the provider and compatible structured-output model ID in Settings. Initial model: `OPENAI_MODEL` or `gpt-4.1`. The pipeline runs data analysis → diagnosis → deterministic ranking → experiment design → critic. The initial model is a configurable default, not a claim about the latest or cheapest model.

To estimate costs, set `LLM_PRICING_MODEL` to the exact `provider/model` combination and set `LLM_INPUT_USD_PER_MILLION`, `LLM_OUTPUT_USD_PER_MILLION`, optionally `LLM_CACHED_INPUT_USD_PER_MILLION`. Check your provider's current prices. Missing or mismatched prices remain **unknown**, never zero. Usage is recorded for validation retries and rejected attempts. Provider HTTP failures before a usage response cannot be priced. External API cost is recorded as zero incremental per-call charge, excluding existing service subscriptions.

Every stage validates with Zod, retries invalid output once, and then fails. Evidence IDs must resolve to actual normalized metrics, hypothesis references must exist, and experiment baselines must match the exact metric name/value. A separate critic checks semantic support and causation; this is still model judgment, not mathematical proof that every natural-language statement is true. A rejection triggers one full revision, with a maximum of two analysis attempts. The model has no tool access. Raw external API responses, credentials and customer records are not sent to it; bounded normalized metrics and repository context are treated as untrusted data.

A run uses a scheduler, a concurrency guard, a one-minute launch cooldown, and an eleven-minute deadline watchdog. Snapshots are immutable; accepted observations, hypotheses, proposed experiment, current-constraint belief and completed status commit in one transaction. Belief revisions retain previous state in append-only events. Prior 7/28-day MRR snapshots are compared only when available within one day of the target timestamp. All experiments remain `proposed`. V1 exposes no approval/execution/deployment/email/payment mutation routes.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npx convex dev --once
```

Browser tests need the local backend and frontend running plus Playwright Chromium (`npx playwright install --with-deps chromium`). A signed-out smoke test runs without an account. The full test requires a **dedicated local QA deployment/account** with the operator configured, registration enabled, no company integration credentials, and `QA_PASSWORD_FILE` pointing to a local file with its password. Optional `QA_OPERATOR_EMAIL` defaults to `qa-operator@example.test`. It creates local test state and deliberately exercises a missing-Stripe failure; never run it against your real workspace.

```sh
QA_PASSWORD_FILE=/path/to/private/password-file npm run test:e2e
```

Unit and Convex integration fixtures are isolated from application data. There is no demo-data fallback. A live VisitorPing acceptance run requires the actual read-only credentials and an LLM key; mocked tests are not evidence of a successful live company diagnosis.

## References used

- [Convex + Better Auth setup](https://get-convex-better-auth.mintlify.app/framework-guides/nextjs) (installed package peer requirements take precedence over the older version pin in this guide).
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- [Stripe subscription analytics](https://docs.stripe.com/billing/subscriptions/analytics).
- [Search Console query API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
