# Implementation status

## Completed

- Implemented the V1 read-only business loop from `spec.md` in Next.js, TypeScript, Tailwind, shadcn/ui and Convex.
- Better Auth 1.6.30 with the Convex adapter, operator-only registration, authenticated subject ownership, sign-in and sign-out. No Clerk package or application code.
- Structured company/objective settings; immutable metric snapshots; runs, observations, hypotheses, proposed experiments, durable beliefs, append-only events and model usage. Reserved action/result tables have no execution APIs.
- Read-only Stripe, PostHog, Search Console, GitHub and Vercel collectors with explicit periods, definitions, samples, pagination/error handling and independent failures.
- Gross Stripe MRR normalization, cohort activation, sessions/activity retention, 7/28-day comparisons, evidence references, missing information and freshness context.
- OpenAI and Anthropic strict JSON providers, separate analyst/diagnostician/designer/critic stages, Zod validation, deterministic ranking, one validation retry, maximum two analysis attempts, model-specific price configuration and usage accounting.
- Transactional accepted-result persistence, concurrency guard, launch cooldown, deadline watchdog, immutable snapshots and auditable belief revisions.
- Overview, metric provenance, paginated runs and record lists, run details, critic/opportunity inspection, integration configuration check and objective/provider settings.
- Local backend pushed successfully; Next.js running at http://localhost:3000 with Convex on ports 3210/3211.
- Lint: PASS, no warnings. Typecheck: PASS. Unit/integration suite: 25 PASS. Dedicated integration command: 12 PASS. Production build: PASS. Production dependency audit: zero reported vulnerabilities.
- Playwright: 2 PASS against real local Better Auth and Convex. Covered registration/sign-in, company creation, settings save, missing integration configuration, missing-Stripe run failure/event history, navigation, mobile overflow and sign-out; no page runtime errors.
- Screenshots inspected at 1440×1000 and 390×844. Fixed mobile grid overflow and preserved mobile sign-out. Browser plugin unavailable; Playwright used. This container needed temporary local libraries and fonts. `view_image` could not initialize its sandbox; screenshots were read through the reviewed shell and displayed for inspection instead.
- Logical implementation and setup/documentation commits created locally. Nothing published or deployed to production.

## In Progress

- Operator account handoff: the requested real email has not yet been supplied. Temporary QA access was disabled and registration closed after tests.

## Remaining

- Set the real `OPERATOR_EMAIL`, briefly enable local/private registration, create the account, then close registration.
- Configure VisitorPing's actual server-side read-only credentials, verify PostHog event names and choose/configure an LLM provider/model.
- Run the live VisitorPing acceptance cycle and reconcile the revenue/funnel definitions with the company's actual setup. Milestone 1 is NOT certified complete without this real-data run.

## Known Issues / Limits

- No real company integration or LLM credentials were available; successful reasoning tests use isolated fixtures, not claims about VisitorPing.
- V1 MRR is USD gross licensed recurring revenue, before discounts. Mixed currencies, tiered/custom prices and incomplete item lists fail explicitly. Metered revenue is excluded. Gross invoice receipts are not net accounting revenue.
- Google OAuth access tokens must be refreshed externally. Search Console has an explicit reporting delay and bounded query/page samples. GitHub context is sampled; Vercel reports the latest ready production deployment, which is not proof of the currently aliased deployment after a rollback.
- Semantic factuality is checked by a critic, not formally guaranteed. All evidence references and baseline values are checked in code.
- Historical MRR needs actual prior snapshots. Activity retention is not paid-customer retention. Within-window activation gives recent signups less follow-up time.
- Token cost remains unknown unless configured rates match the exact selected provider/model. Existing integration subscriptions and provider failures without usage responses are not priced.
- One operator / one company per account with deployment-level credentials; no multi-tenant credential management or scheduled autonomous cycles exposed in V1.
- Local QA account/history remains isolated under its own authenticated subject. It contains no real company metrics and cannot access a future operator's company. Its email allowlist entry was removed after verification.

## Decisions

- Use Better Auth as explicitly requested. Installed package peer requirements supersede the older version pin in the online quickstart guide.
- Use Convex's typed auth bridge with Better Auth's real token endpoints because adapter 0.12.5's React wrapper type resolves the session to `never` with this supported Better Auth version.
- Follow the spec's minimal UI scope; omit generated visual concepts and extensive polish.
- Use a standard local scaffold and a bounded business pipeline, without hosted scaffold telemetry, chat/agent infrastructure, or multi-agent hierarchy.
- Never fabricate missing data or silently use demonstration metrics. Successful fixture tests and the deliberately failed browser run are distinguished from live acceptance.
- Source setup and metric semantics are documented in README.md and .env.example. Credentials never enter source control or client bundles.

## Headless development handoff

- Added a reusable Mac SSH configuration example and everyday startup instructions in README.md. Preserve localhost:3000 for the browser and Better Auth; also forward Convex port 3210. Authentication proxy port 3211 stays on Linux.
- SSH configuration syntax checked with `ssh -G`; no server was started and no Mac configuration was modified from Linux.
