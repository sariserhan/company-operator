# Autonomous Company Operator — V1 Engineering Specification

## 1. Mission

Build a system that autonomously analyzes a real software business, identifies the current highest-value business constraint, forms hypotheses, proposes an experiment, records its reasoning in structured persistent state, and stops.

The initial company used for testing is **VisitorPing**.

The first version MUST be read-only.

The system must NOT:

* modify production code
* deploy anything
* send emails
* contact customers
* modify Stripe data
* spend money
* run advertisements
* modify analytics
* merge pull requests
* create external side effects

The purpose of V1 is to prove:

> Given only the objective “Reach $5,000 MRR,” can the system independently inspect real company data and determine the most valuable thing the business should do next?

---

# 2. Core Principle

Do not build another chatbot.

Do not build another generic agent framework.

Build a **business operating loop**.

The central loop is:

```text
OBJECTIVE
    ↓
OBSERVE REALITY
    ↓
IDENTIFY BOTTLENECK
    ↓
FORM HYPOTHESES
    ↓
RANK OPPORTUNITIES
    ↓
PROPOSE EXPERIMENT
    ↓
RECORD STRUCTURED STATE
    ↓
STOP
```

Every conclusion must be traceable to real company data.

The AI must distinguish between:

* facts
* observations
* hypotheses
* assumptions
* recommendations

Never store an AI guess as a fact.

---

# 3. Primary Objective

Initial company:

```text
VisitorPing
```

Primary objective:

```text
Reach $5,000 monthly recurring revenue.
```

The system should determine the current MRR automatically from Stripe.

The objective must be stored as structured data rather than hardcoded into prompts.

Example:

```json
{
  "type": "revenue",
  "metric": "mrr",
  "target": 5000,
  "currency": "USD",
  "direction": "increase"
}
```

---

# 4. Technology Stack

Use:

```text
Frontend:
Next.js
TypeScript
Tailwind CSS
shadcn/ui

Backend/state:
Convex

LLM:
Provider abstraction

Initial supported providers:
OpenAI
Anthropic

Integrations:
Stripe
PostHog
Google Search Console
GitHub
Vercel

Hosting:
Vercel
```

Do not introduce unnecessary infrastructure.

Do NOT use:

* Kafka
* Temporal
* Kubernetes
* Redis
* separate PostgreSQL
* microservices

unless technically necessary later.

V1 should remain simple.

---

# 5. Project Structure

Recommended structure:

```text
company-operator/

  app/
    dashboard/
    companies/
    runs/
    experiments/
    beliefs/
    settings/

  components/

  lib/
    ai/
      provider.ts
      openai.ts
      anthropic.ts
      prompts.ts
      schemas.ts

    integrations/
      stripe/
      posthog/
      search-console/
      github/
      vercel/

    business/
      metrics.ts
      analysis.ts
      prioritization.ts
      evaluator.ts

  convex/
    schema.ts

    companies.ts
    objectives.ts
    metrics.ts
    observations.ts
    hypotheses.ts
    experiments.ts
    actions.ts
    results.ts
    beliefs.ts
    runs.ts

    companyCycle.ts

  tests/
```

Keep domain logic separate from integrations.

---

# 6. Core Data Model

Implement the following entities.

## Company

```ts
type Company = {
  name: string;
  description?: string;
  websiteUrl: string;

  status:
    | "active"
    | "paused";

  createdAt: number;
};
```

---

## Objective

```ts
type Objective = {
  companyId: Id<"companies">;

  name: string;

  metric:
    | "mrr"
    | "revenue"
    | "customers"
    | "signups"
    | "custom";

  target: number;

  currency?: string;

  direction:
    | "increase"
    | "decrease";

  status:
    | "active"
    | "achieved"
    | "paused";

  priority: number;

  createdAt: number;
};
```

---

## Metric Snapshot

Metrics must be immutable historical snapshots.

```ts
type MetricSnapshot = {
  companyId: Id<"companies">;

  source:
    | "stripe"
    | "posthog"
    | "search_console"
    | "github"
    | "vercel"
    | "derived";

  metric: string;

  value: number;

  unit?: string;

  periodStart?: number;
  periodEnd?: number;

  capturedAt: number;

  metadata?: unknown;
};
```

Examples:

```text
mrr
active_customers
website_visitors_7d
signup_started_7d
signup_completed_7d
tracking_installed_7d
pricing_page_views_7d
trial_started_7d
paid_conversion_7d
organic_clicks_28d
organic_impressions_28d
deployments_7d
```

---

# 7. Observation

An observation must describe something directly supported by collected data.

Example:

```json
{
  "statement": "76% of registered users did not complete tracking installation.",
  "evidence": [
    "38 registrations",
    "9 successful installations"
  ],
  "importance": 0.92
}
```

Schema:

```ts
type Observation = {
  companyId: Id<"companies">;
  runId: Id<"runs">;

  statement: string;

  evidence: Array<{
    metric?: string;
    value?: number;
    source?: string;
    description: string;
  }>;

  importance: number;

  createdAt: number;
};
```

The model must not create observations unsupported by evidence.

---

# 8. Hypothesis

A hypothesis is an explanation that may or may not be true.

Example:

```text
Users abandon onboarding because installation instructions
are too technically difficult.
```

Schema:

```ts
type Hypothesis = {
  companyId: Id<"companies">;
  runId: Id<"runs">;

  statement: string;

  basedOnObservationIds: Id<"observations">[];

  confidence: number;

  status:
    | "untested"
    | "testing"
    | "supported"
    | "rejected"
    | "inconclusive";

  createdAt: number;
};
```

Confidence must be between:

```text
0.0 - 1.0
```

Confidence is not truth.

---

# 9. Experiment

An experiment tests a hypothesis.

Example:

```text
Hypothesis:
Installation instructions are causing setup abandonment.

Experiment:
Create a simpler onboarding flow.

Success metric:
tracking_install_completion_rate

Baseline:
24%

Target:
>= 35%
```

Schema:

```ts
type Experiment = {
  companyId: Id<"companies">;

  hypothesisId: Id<"hypotheses">;

  title: string;
  description: string;

  successMetric: string;

  baselineValue?: number;

  targetValue?: number;

  expectedImpact: number;
  confidence: number;

  estimatedCostUsd: number;

  estimatedEffort:
    | "small"
    | "medium"
    | "large";

  status:
    | "proposed"
    | "approved"
    | "running"
    | "completed"
    | "rejected";

  createdAt: number;
};
```

V1 only creates:

```text
status = proposed
```

It must not execute experiments.

---

# 10. Beliefs

The company operator needs durable business knowledge.

Example:

```text
Belief:
Most VisitorPing onboarding abandonment occurs before
tracking-script verification.

Confidence:
0.91

Source:
metrics from run #43
```

Schema:

```ts
type Belief = {
  companyId: Id<"companies">;

  subject: string;

  statement: string;

  confidence: number;

  status:
    | "active"
    | "superseded"
    | "invalidated";

  supportingEvidence: string[];

  createdAt: number;
  updatedAt: number;
};
```

Beliefs must be updateable when new evidence contradicts them.

Do not duplicate identical beliefs endlessly.

---

# 11. Run

Every execution of the company operator is a Run.

```ts
type Run = {
  companyId: Id<"companies">;

  trigger:
    | "manual"
    | "scheduled";

  startedAt: number;
  completedAt?: number;

  status:
    | "running"
    | "completed"
    | "failed";

  model: string;

  summary?: string;

  error?: string;
};
```

---

# 12. Integrations

All integrations are READ ONLY in V1.

## Stripe

Collect:

```text
MRR
active subscriptions
new subscriptions
cancellations
trial subscriptions
revenue
subscription plans
customer count
```

Never retrieve unnecessary payment-card details.

Never mutate Stripe.

---

## PostHog

Collect metrics such as:

```text
visitors
sessions
signups
signup completion
onboarding progress
tracking installation
activation events
pricing page visits
conversion funnel
retention
```

Prefer structured API queries.

Do not rely on screenshots.

---

## Google Search Console

Collect:

```text
impressions
clicks
CTR
average position

top queries
top pages
query changes
page changes
```

Default comparison:

```text
last 28 days
vs
previous 28 days
```

---

## GitHub

Read:

```text
repository information
recent commits
open pull requests
issues
deployment-related commits
README
relevant application structure
```

V1 MUST NOT:

```text
commit
branch
open PR
merge
modify files
```

---

## Vercel

Read:

```text
production deployment
recent deployments
deployment timestamps
deployment failures
deployment metadata
```

No deployments in V1.

---

# 13. Normalized Business Snapshot

Do not send raw API responses directly to the LLM.

Create a normalized business snapshot first.

Example:

```json
{
  "objective": {
    "metric": "mrr",
    "current": 228,
    "target": 5000
  },

  "revenue": {
    "mrr": 228,
    "activeCustomers": 12,
    "newCustomers7d": 2,
    "churnedCustomers7d": 1
  },

  "traffic": {
    "visitors7d": 1423,
    "pricingViews7d": 221
  },

  "funnel": {
    "signupStarted7d": 38,
    "signupCompleted7d": 31,
    "trackingInstalled7d": 9,
    "paidCustomers7d": 2
  },

  "seo": {
    "clicks28d": 481,
    "impressions28d": 18200,
    "ctr": 0.026,
    "averagePosition": 18.4
  },

  "engineering": {
    "deployments7d": 7,
    "failedDeployments7d": 0
  }
}
```

This snapshot becomes the principal input to business analysis.

---

# 14. Company Cycle

Create:

```ts
runCompanyCycle(companyId)
```

V1 execution sequence:

```text
START RUN

↓

LOAD COMPANY

↓

LOAD OBJECTIVE

↓

FETCH STRIPE DATA

↓

FETCH POSTHOG DATA

↓

FETCH SEARCH CONSOLE DATA

↓

FETCH GITHUB DATA

↓

FETCH VERCEL DATA

↓

NORMALIZE BUSINESS SNAPSHOT

↓

COMPARE WITH HISTORICAL SNAPSHOTS

↓

ASK BUSINESS REASONING MODEL TO ANALYZE

↓

VALIDATE STRUCTURED RESPONSE

↓

STORE OBSERVATIONS

↓

STORE HYPOTHESES

↓

STORE PROPOSED EXPERIMENTS

↓

UPDATE BELIEFS

↓

GENERATE RUN SUMMARY

↓

STOP
```

No external side effects.

---

# 15. AI Output Contract

The AI must NEVER return free-form reasoning as the primary result.

Use strict structured output.

Example:

```ts
type CompanyAnalysis = {
  executiveSummary: string;

  currentBottleneck: {
    area:
      | "traffic"
      | "activation"
      | "conversion"
      | "retention"
      | "pricing"
      | "product"
      | "distribution"
      | "unknown";

    statement: string;

    evidence: string[];

    severity: number;
  };

  observations: Array<{
    statement: string;
    evidence: string[];
    importance: number;
  }>;

  hypotheses: Array<{
    statement: string;
    confidence: number;
    evidence: string[];
  }>;

  opportunities: Array<{
    title: string;

    description: string;

    estimatedImpact: number;
    confidence: number;
    estimatedCostUsd: number;

    effort:
      | "small"
      | "medium"
      | "large";

    score: number;
  }>;

  recommendedExperiment: {
    title: string;

    hypothesis: string;

    proposedChange: string;

    successMetric: string;

    baseline?: number;

    target?: number;

    expectedImpact: string;

    estimatedCostUsd: number;

    confidence: number;
  };

  missingInformation: string[];
};
```

Validate with Zod.

If validation fails:

```text
retry once
```

If still invalid:

```text
mark run FAILED
```

Do not silently store malformed results.

---

# 16. Opportunity Ranking

The model may suggest several actions.

Calculate ranking with code rather than trusting the model's ranking blindly.

Use approximately:

```text
priorityScore =
  expectedImpact
  × confidence
  × urgencyMultiplier
  / effortMultiplier
  / max(costMultiplier, 1)
```

Suggested mappings:

```text
effort:

small  = 1
medium = 2
large  = 4
```

Cost multiplier can be normalized.

The exact formula may evolve.

Store the underlying factors.

---

# 17. Business Reasoning Rules

The model must follow these rules:

### Rule 1

Identify the largest current constraint rather than randomly proposing improvements.

### Rule 2

Prefer fixing:

```text
existing conversion bottlenecks
```

before attempting:

```text
more traffic
```

when evidence indicates conversion is severely broken.

### Rule 3

Separate:

```text
observation
```

from:

```text
hypothesis
```

### Rule 4

Never invent metrics.

If data is missing, explicitly say:

```text
UNKNOWN
```

### Rule 5

Prefer measurable experiments.

Bad:

```text
Improve marketing.
```

Good:

```text
Test simplified tracking installation onboarding
with setup completion as the success metric.
```

### Rule 6

Every proposed experiment must specify:

```text
hypothesis
action
metric
baseline if available
target if possible
estimated cost
confidence
```

### Rule 7

Prefer reversible experiments.

### Rule 8

Do not recommend actions based solely on generic startup advice.

Recommendations must connect to company-specific evidence.

---

# 18. Prompt Architecture

Use multiple stages rather than asking one enormous prompt to do everything.

Recommended:

```text
Stage 1:
Data analyst

Stage 2:
Business diagnostician

Stage 3:
Experiment designer

Stage 4:
Critic/evaluator
```

These can initially use the same underlying model.

The separation is logical.

---

# 19. Critic Pass

Before accepting the final recommendation, run a second evaluation.

Prompt the critic with:

```text
Objective
Business snapshot
Observations
Hypotheses
Recommended experiment
```

Ask:

```text
Is the recommendation actually supported by evidence?

Is there a more fundamental bottleneck?

Did the analysis confuse correlation with causation?

Did it invent information?

Can the result be measured?

Is the proposed experiment economically reasonable?
```

Structured result:

```ts
type Critique = {
  accepted: boolean;

  issues: string[];

  severity:
    | "none"
    | "low"
    | "medium"
    | "high";

  suggestedRevision?: string;
};
```

If:

```text
severity = high
```

run business analysis once more incorporating the critique.

Maximum:

```text
2 analysis attempts
```

Avoid infinite loops.

---

# 20. Dashboard

The dashboard should be minimal.

Main page:

```text
VisitorPing

Objective
$228 / $5,000 MRR

Current bottleneck
Tracking installation completion

Confidence
81%

Latest recommendation
Simplify tracking installation onboarding

Expected result
24% → 40% completion

Last analyzed
10 minutes ago
```

Sections:

```text
Overview
Metrics
Runs
Observations
Hypotheses
Experiments
Beliefs
Integrations
Settings
```

Do not spend significant development effort on visual polish yet.

---

# 21. Run Detail Screen

Show:

```text
Run #42

Started
Completed
Model
Status

Business Snapshot

Observations

Current Bottleneck

Hypotheses

Ranked Opportunities

Recommended Experiment

Critic Review

Missing Data
```

Make every conclusion auditable.

---

# 22. Historical Comparison

The system must not only inspect the current state.

Compare:

```text
current 7 days
previous 7 days

current 28 days
previous 28 days
```

Examples:

```text
Traffic +18%
Signup rate -12%
Activation -33%
MRR +4%
SEO clicks +9%
```

This helps detect changing constraints.

---

# 23. Event History

Create an append-only business event log.

Example:

```text
RUN_STARTED
METRICS_FETCHED
BUSINESS_SNAPSHOT_CREATED
OBSERVATION_CREATED
HYPOTHESIS_CREATED
EXPERIMENT_PROPOSED
BELIEF_UPDATED
RUN_COMPLETED
```

Event record:

```ts
type CompanyEvent = {
  companyId: Id<"companies">;

  runId?: Id<"runs">;

  type: string;

  payload: unknown;

  timestamp: number;
};
```

Do not delete historical events.

---

# 24. Provider Abstraction

Do not hardcode the application around one model.

Interface:

```ts
interface ReasoningProvider {
  analyzeCompany(
    input: CompanyAnalysisInput
  ): Promise<CompanyAnalysis>;

  critiqueRecommendation(
    input: CritiqueInput
  ): Promise<Critique>;
}
```

Implement initially:

```text
OpenAIProvider
AnthropicProvider
```

Provider should be selectable by configuration.

Store:

```text
provider
model
runId
```

for every analysis.

---

# 25. Integrations Must Fail Independently

If Search Console fails, the entire company cycle should not necessarily fail.

Example:

```text
Stripe             OK
PostHog            OK
Search Console     ERROR
GitHub             OK
Vercel             OK
```

Analysis should continue with:

```text
missingInformation:
- Search Console unavailable
```

However:

If critical revenue data is unavailable, mark the run:

```text
INCOMPLETE
```

or fail explicitly.

Never fabricate replacement numbers.

---

# 26. Data Freshness

Every metric must include:

```text
source
capturedAt
period
```

The AI should know when information is stale.

Example:

```text
Stripe data:
2 minutes old

PostHog:
4 minutes old

Search Console:
48 hours delayed
```

Do not treat all integrations as real-time.

---

# 27. Security

All credentials must remain server-side.

Use environment variables.

Never expose:

```text
Stripe keys
PostHog personal API key
Google credentials
GitHub tokens
Vercel tokens
LLM provider API keys
```

to the browser.

Use the minimum required scopes.

V1 integrations MUST be configured read-only wherever possible.

---

# 28. Logging

Record:

```text
integration calls
run durations
model usage
token usage
errors
retries
business analysis version
prompt version
```

Do not log secrets.

---

# 29. Cost Tracking

Track LLM cost per run.

Example:

```text
Run #48

Input tokens: 28,182
Output tokens: 4,091

Model cost:
$0.18

External API cost:
$0

Total:
$0.18
```

Store this in the run.

Eventually the company operator itself must understand operating costs.

---

# 30. Initial Milestone

Milestone 1 is complete when:

```text
1. VisitorPing integrations connect successfully.

2. Current Stripe MRR is obtained automatically.

3. PostHog funnel information is obtained.

4. Search Console information is obtained.

5. GitHub/Vercel state is available.

6. runCompanyCycle() executes successfully.

7. System creates evidence-backed observations.

8. System identifies one primary bottleneck.

9. System creates at least one hypothesis.

10. System proposes one measurable experiment.

11. Critic evaluates the recommendation.

12. Everything persists in Convex.

13. Dashboard displays result.

14. No external side effects occur.
```

---

# 31. Acceptance Test

The system receives no business instruction other than:

```text
Objective:
Reach $5,000 MRR.
```

A successful run should produce something approximately like:

```text
CURRENT STATE

MRR:
$228

Visitors / 7d:
1,423

Registrations:
38

Completed tracking installations:
9

Paid customers:
2


PRIMARY BOTTLENECK

Tracking installation activation.

76% of registered users failed to complete
tracking installation.


EVIDENCE

38 registrations
9 successful installations


HYPOTHESIS

The current installation process creates too
much technical friction for non-technical users.

Confidence:
0.81


RECOMMENDED EXPERIMENT

Build simplified installation onboarding:

1. detect platform
2. show platform-specific instructions
3. one-click snippet copy
4. automatic installation verification
5. clear success state


SUCCESS METRIC

Tracking installation completion rate


BASELINE

24%


TARGET

>= 40%


ESTIMATED COST

$0


EXPECTED IMPACT

Substantially more activated users entering
the paid conversion funnel.
```

The exact recommendation does not need to match this example.

What matters is that it is:

```text
data-driven
specific
measurable
economically relevant
```

---

# 32. What NOT to Build Yet

Do NOT implement:

```text
autonomous email
autonomous advertisements
autonomous Stripe spending
autonomous production deployment
autonomous customer support
contractor hiring
browser automation
multi-agent hierarchy
CEO / CTO / CMO agents
automatic pricing changes
automatic purchasing
production writes
```

Those are later phases.

First prove autonomous business diagnosis.

---

# 33. Phase 2 — After V1 Works

Only after V1 demonstrates useful recommendations:

Add GitHub write capabilities.

Flow:

```text
business problem
    ↓
experiment proposed
    ↓
human approves implementation
    ↓
AI creates branch
    ↓
AI modifies code
    ↓
AI runs tests
    ↓
AI creates Vercel preview
    ↓
AI opens PR
    ↓
human approves deployment
```

Production remains approval-gated.

---

# 34. Phase 3

Add experiment measurement.

```text
AI proposes experiment
        ↓
implementation
        ↓
approval
        ↓
deployment
        ↓
wait measurement period
        ↓
collect metrics
        ↓
compare baseline
        ↓
KEEP / ROLLBACK
        ↓
update company beliefs
```

This creates the first true closed loop.

---

# 35. Phase 4

Expand business actions:

```text
SEO
content
distribution
marketing experiments
pricing experiments
customer research
support
advertising
```

Each action must have:

```text
cost
risk
expected return
approval policy
measurement
```

---

# 36. Long-Term Goal

The long-term system should operate like:

```text
OBJECTIVE

$5,000 MRR

       ↓

continuously observe company

       ↓

determine current constraint

       ↓

generate hypotheses

       ↓

choose highest expected-value experiment

       ↓

allocate resources

       ↓

perform authorized action

       ↓

observe economic result

       ↓

update beliefs

       ↓

change strategy

       ↓

repeat
```

The system succeeds when its performance is measured by:

```text
economic outcome
```

rather than:

```text
number of completed AI tasks
```

---

# 37. Development Rules for the Coding Agent

Work autonomously through the implementation.

Do not stop after scaffolding.

Do not leave placeholder TODO implementations for core functionality.

For each implementation unit:

```text
implement
test
lint
type-check
fix failures
commit
continue
```

Create small logical Git commits.

Do not commit broken code.

Maintain:

```text
IMPLEMENTATION_STATUS.md
```

with:

```text
Completed
In Progress
Remaining
Known Issues
Decisions
```

Update it as work progresses.

Before declaring V1 finished, run:

```text
lint
typecheck
unit tests
integration tests where feasible
production build
```

All must pass.

---

# 38. Most Important Principle

Do not optimize for making the AI appear autonomous.

Optimize for determining whether it can make **better business decisions from reality**.

The key question throughout development is:

> If the human provides only the economic objective, can the system independently determine what should happen next, explain why using real evidence, and propose a measurable way to verify whether it was correct?

Everything in V1 exists to answer that question.
