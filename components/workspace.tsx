"use client";
import { Component, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useConvexAuth,
  useQuery,
  useMutation,
  useAction,
  usePaginatedQuery,
} from "convex/react";
import {
  Activity,
  ChartNoAxesCombined,
  FlaskConical,
  Lightbulb,
  Link2,
  ListChecks,
  Settings,
  ShieldCheck,
  Target,
  BookOpen,
  LogOut,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { analysisSchema } from "@/lib/ai/schemas";
import { snapshotSchema } from "@/lib/business/types";
import { AuthForm } from "./auth-form";
import {
  AnalysisView,
  MetricsView,
  RunDetail,
  money,
  timestamp,
} from "./run-view";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "./ui/empty";
import { Field, FieldLabel, FieldGroup } from "./ui/field";
const navigation = [
  ["Overview", "dashboard", Target],
  ["Metrics", "metrics", ChartNoAxesCombined],
  ["Runs", "runs", Activity],
  ["Observations", "observations", ListChecks],
  ["Hypotheses", "hypotheses", Lightbulb],
  ["Experiments", "experiments", FlaskConical],
  ["Beliefs", "beliefs", BookOpen],
  ["Integrations", "integrations", Link2],
  ["Settings", "settings", Settings],
] as const;
class WorkspaceError extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="notice stack">
        <h1>Workspace unavailable</h1>
        <p>
          Check that your account matches the configured operator and the
          backend is running.
        </p>
        <Button
          onClick={() =>
            authClient.signOut().then(() => this.setState({ error: false }))
          }
        >
          Sign out
        </Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function Workspace({ path }: { path: string[] }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading)
    return (
      <main className="notice">
        <Skeleton className="h-24 w-full" />
      </main>
    );
  if (!isAuthenticated) return <AuthForm />;
  return (
    <WorkspaceError>
      <CompanyWorkspace path={path} />
    </WorkspaceError>
  );
}
function CompanyWorkspace({ path }: { path: string[] }) {
  const company = useQuery(api.companies.current, {});
  if (company === undefined)
    return (
      <main className="notice">
        <Skeleton className="h-24 w-full" />
      </main>
    );
  if (company === null) return <CreateCompany />;
  const section = path[0] ?? "dashboard";
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand no-underline" href="/dashboard">
          <Activity size={22} /> Company Operator
        </Link>
        <div>
          <p className="font-semibold">{company.name}</p>
          <p className="muted text-xs">Business workspace</p>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {navigation.map(([label, slug, Icon]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              aria-current={section === slug ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer mt-auto stack">
          <p className="muted text-xs inline">
            <ShieldCheck size={16} /> Read-only company access
          </p>
          <Button variant="ghost" onClick={() => authClient.signOut()}>
            <LogOut data-icon="inline-start" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="main">
        <Section
          key={path.join("/")}
          section={section}
          path={path}
          companyId={company._id}
        />
      </main>
    </div>
  );
}
function CreateCompany() {
  const create = useMutation(api.companies.create),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="notice stack">
      <h1>Set up VisitorPing</h1>
      <p>
        The initial objective is $5,000 MRR. Connect the business data, then run
        a read-only analysis.
      </p>
      <form
        className="stack"
        action={async (data) => {
          setBusy(true);
          try {
            await create({ websiteUrl: String(data.get("website")) });
          } catch {
            setError(
              "Could not create the company. Enter a valid HTTPS website.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="website">Company website</FieldLabel>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://your-company.com"
              required
            />
          </Field>
        </FieldGroup>
        <Button disabled={busy}>
          {busy ? "Creating…" : "Create workspace"}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </main>
  );
}
function Section({
  section,
  path,
  companyId,
}: {
  section: string;
  path: string[];
  companyId: Id<"companies">;
}) {
  if (section === "runs" && path[1])
    return <RunDetail runId={path[1] as Id<"runs">} />;
  if (section === "runs") return <Runs companyId={companyId} />;
  if (section === "settings") return <SettingsView companyId={companyId} />;
  if (section === "integrations") return <Integrations companyId={companyId} />;
  if (
    ["observations", "hypotheses", "experiments", "beliefs"].includes(section)
  )
    return (
      <Records
        companyId={companyId}
        table={
          section as "observations" | "hypotheses" | "experiments" | "beliefs"
        }
      />
    );
  if (section === "dashboard" || section === "metrics")
    return (
      <Overview companyId={companyId} metricsOnly={section === "metrics"} />
    );
  return (
    <>
      <h1>Page not found</h1>
      <Link href="/dashboard">Return to overview</Link>
    </>
  );
}
function RunButton({
  companyId,
  running = false,
}: {
  companyId: Id<"companies">;
  running?: boolean;
}) {
  const start = useMutation(api.runs.start),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="stack">
      <Button
        disabled={busy || running}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const id = await start({ companyId });
            router.push(`/runs/${id}`);
          } catch {
            setError(
              "Could not start. Check the active objective, or wait a minute before retrying.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Activity data-icon="inline-start" />
        {running ? "Analysis running" : busy ? "Starting…" : "Run analysis"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
function Overview({
  companyId,
  metricsOnly,
}: {
  companyId: Id<"companies">;
  metricsOnly: boolean;
}) {
  const raw = useQuery(api.runs.latest, { companyId }),
    settings = useQuery(api.companies.settings, { companyId });
  if (raw === undefined || settings === undefined)
    return <Skeleton className="h-32 w-full" />;
  const run = raw ? (JSON.parse(raw) as Doc<"runs">) : null,
    snapshot = run?.snapshotJson
      ? snapshotSchema.parse(JSON.parse(run.snapshotJson))
      : null,
    analysis = run?.analysisJson
      ? analysisSchema.parse(JSON.parse(run.analysisJson))
      : null;
  const objective = settings.objective;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyeline">VisitorPing</p>
          <h1>{metricsOnly ? "Metrics" : "Business overview"}</h1>
        </div>
        <RunButton companyId={companyId} running={run?.status === "running"} />
      </div>
      {metricsOnly ? (
        <MetricsView snapshot={snapshot} />
      ) : (
        <>
          {run?.status === "failed" ? (
            <Alert variant="destructive">
              <AlertTitle>Latest analysis failed</AlertTitle>
              <AlertDescription>
                {run.error} <Link href={`/runs/${run._id}`}>Inspect run</Link>
              </AlertDescription>
            </Alert>
          ) : null}
          <section className="metric-grid">
            <div>
              <p className="muted">
                {objective?.name ?? "No active objective"}
              </p>
              <p className="metric-value">
                {money(
                  snapshot?.metrics.find((m) => m.metric === "mrr")?.value ??
                    null,
                )}
              </p>
              <p className="muted">of {money(objective?.target ?? null)} MRR</p>
              <div className="progress mt-4">
                <div
                  style={{
                    width: `${objective?.target && snapshot?.objective.current !== null && snapshot?.objective.current !== undefined ? Math.min(100, Math.max(0, (snapshot.objective.current / objective.target) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <p className="muted">Recommendation confidence</p>
              <p className="metric-value">
                {analysis
                  ? `${Math.round(analysis.recommendedExperiment.confidence * 100)}%`
                  : "Unknown"}
              </p>
              <p className="muted">An estimate, not a verified fact</p>
            </div>
            <div>
              <p className="muted">Last analyzed</p>
              <p className="mt-3 font-semibold">
                {run?.completedAt
                  ? timestamp(run.completedAt)
                  : run
                    ? "Analysis in progress"
                    : "Not yet analyzed"}
              </p>
              {run ? (
                <Link className="text-sm underline" href={`/runs/${run._id}`}>
                  Inspect latest run
                </Link>
              ) : null}
            </div>
          </section>
          {analysis && run ? (
            <>
              <section className="section">
                <h2>Executive summary</h2>
                <p>{analysis.executiveSummary}</p>
              </section>
              <AnalysisView run={run} />
            </>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {run?.status === "running"
                    ? "Your analysis is running"
                    : "Find the next business constraint"}
                </EmptyTitle>
                <EmptyDescription>
                  Configure your integrations and run an analysis. Observations,
                  hypotheses and a proposed experiment will appear here after
                  critic review.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" asChild>
                <Link href="/integrations">Review integrations</Link>
              </Button>
            </Empty>
          )}
        </>
      )}
    </>
  );
}
function Runs({ companyId }: { companyId: Id<"companies"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.runs.list,
    { companyId },
    { initialNumItems: 20 },
  );
  return (
    <>
      <div className="page-head">
        <h1>Runs</h1>
        <RunButton
          companyId={companyId}
          running={results.some((r) => r.status === "running")}
        />
      </div>
      {results.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Started</th>
                <th>Status</th>
                <th>Model</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td>
                    <Link href={`/runs/${r._id}`} className="underline">
                      {r._id.slice(-6)}
                    </Link>
                  </td>
                  <td>{timestamp(r.startedAt)}</td>
                  <td>
                    <Badge variant="secondary">{r.status}</Badge>
                  </td>
                  <td>{r.model}</td>
                  <td>
                    {r.costUsd === null
                      ? "Unknown"
                      : `$${r.costUsd.toFixed(4)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          {status === "LoadingFirstPage" ? "Loading…" : "No runs yet."}
        </p>
      )}
      {status === "CanLoadMore" ? (
        <Button variant="outline" className="mt-5" onClick={() => loadMore(20)}>
          Load more runs
        </Button>
      ) : null}
    </>
  );
}
function Records({
  companyId,
  table,
}: {
  companyId: Id<"companies">;
  table: "observations" | "hypotheses" | "experiments" | "beliefs";
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.state.list,
    { companyId, table },
    { initialNumItems: 20 },
  );
  return (
    <>
      <div className="page-head">
        <h1 className="capitalize">{table}</h1>
      </div>
      <p className="muted">
        {table === "experiments"
          ? "Proposals only. Experiments are never executed in V1."
          : table === "beliefs"
            ? "Durable, revisable knowledge. Prior versions remain in each run’s event history."
            : "Evidence and uncertainty remain separate. Open the source run for the complete review."}
      </p>
      {results.map((raw) => {
        const r = JSON.parse(raw) as Record<string, unknown>;
        return (
          <article className="record" key={String(r._id)}>
            <h3>{String(r.title ?? r.statement)}</h3>
            {r.description ? <p>{String(r.description)}</p> : null}
            <div className="inline">
              {r.status ? (
                <Badge variant="secondary">{String(r.status)}</Badge>
              ) : null}
              {typeof r.confidence === "number" ? (
                <span className="muted">
                  {Math.round(r.confidence * 100)}% confidence
                </span>
              ) : null}
              <Link href={`/runs/${r.runId}`}>Source run</Link>
            </div>
            {table === "experiments" ? (
              <p>
                {String(r.successMetric)}:{" "}
                {String(r.baselineValue ?? "Unknown")} →{" "}
                {String(r.targetValue ?? "Unknown")} ·{" "}
                {money(Number(r.estimatedCostUsd))} estimated
              </p>
            ) : null}
            <details>
              <summary>Evidence and structured record</summary>
              <pre>{JSON.stringify(r, null, 2)}</pre>
            </details>
          </article>
        );
      })}
      {results.length === 0 ? (
        <p className="muted mt-8">
          {status === "LoadingFirstPage"
            ? "Loading…"
            : `No ${table} recorded yet.`}
        </p>
      ) : null}
      {status === "CanLoadMore" ? (
        <Button variant="outline" className="mt-5" onClick={() => loadMore(20)}>
          Load more
        </Button>
      ) : null}
    </>
  );
}
function Integrations({ companyId }: { companyId: Id<"companies"> }) {
  const inspect = useAction(api.companyCycle.configuration),
    raw = useQuery(api.runs.latest, { companyId }),
    [config, setConfig] = useState<
      { source: string; configured: boolean; missing: string[] }[] | null
    >(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = raw ? (JSON.parse(raw) as Doc<"runs">) : null,
    snapshot = run?.snapshotJson
      ? snapshotSchema.parse(JSON.parse(run.snapshotJson))
      : null;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Integrations</h1>
          <p className="muted">Server-side credentials · Read-only access</p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setConfig(await inspect({}));
              setError("");
            } catch {
              setError("Could not inspect configuration.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Checking…" : "Check configuration"}
        </Button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Configuration</th>
              <th>Last collection</th>
              <th>Required configuration</th>
            </tr>
          </thead>
          <tbody>
            {[
              "stripe",
              "visitorping",
              "search_console",
              "github",
              "vercel",
            ].map((source) => {
              const configured = config?.find((c) => c.source === source),
                result = snapshot?.integrations.find(
                  (i) => i.source === source,
                );
              return (
                <tr key={source}>
                  <td>{source.replace("_", " ")}</td>
                  <td>
                    {configured
                      ? configured.configured
                        ? "Configured"
                        : "Missing credentials"
                      : "Not checked"}
                  </td>
                  <td>
                    {result ? (
                      <>
                        <Badge variant="secondary">{result.status}</Badge>
                        <p className="muted text-xs">
                          {result.calls} calls · {result.durationMs} ms
                        </p>
                      </>
                    ) : (
                      "Not collected"
                    )}
                  </td>
                  <td className="text-xs">
                    {configured?.missing.join(", ") ||
                      "Set credentials in the Convex environment."}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="section">
        <h2>Connection notes</h2>
        <p>
          “Configured” means credentials are present. A run verifies access and
          records collection errors.
        </p>
        <p>
          Use a Stripe restricted read-only key, a VisitorPing analytics service
          token, Google Search Console read-only OAuth scope, GitHub repository
          read permissions, and a Vercel token with minimum available scope.
        </p>
        <p>
          Credentials are configured in the backend environment. See
          .env.example for exact names and README.md for setup.
        </p>
        {snapshot?.missingInformation.map((s, i) => (
          <p key={i} className="muted">
            {s}
          </p>
        ))}
      </section>
    </>
  );
}
function SettingsView({ companyId }: { companyId: Id<"companies"> }) {
  const settings = useQuery(api.companies.settings, { companyId }),
    update = useMutation(api.companies.updateSettings),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  if (!settings) return <Skeleton className="h-32 w-full" />;
  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>
      <form
        className="stack max-w-xl"
        action={async (form) => {
          setBusy(true);
          try {
            await update({
              companyId,
              name: String(form.get("name")),
              metric: "mrr",
              target: Number(form.get("target")),
              currency: "USD",
              direction: "increase",
              provider: String(form.get("provider")) as
                "openai" | "anthropic" | "vercel_gateway",
              model: String(form.get("model")),
            });
            setMessage("Settings saved. They apply to the next run.");
          } catch {
            setMessage(
              "Unable to save settings. Check the target and model ID.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="objective">Objective</FieldLabel>
            <Input
              id="objective"
              name="name"
              defaultValue={settings.objective?.name}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="target">MRR target (USD)</FieldLabel>
            <Input
              id="target"
              name="target"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.objective?.target}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="provider">Reasoning provider</FieldLabel>
            <select
              id="provider"
              name="provider"
              defaultValue={settings.provider}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="vercel_gateway">Vercel AI Gateway</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="model">Model ID</FieldLabel>
            <Input
              id="model"
              name="model"
              defaultValue={settings.model}
              pattern="[a-zA-Z0-9._:\/\-]+"
              required
            />
          </Field>
        </FieldGroup>
        <p className="muted">
          The model must support structured JSON output. Configure its API key
          in the Convex environment. Gateway model IDs use provider/model, such
          as anthropic/claude-sonnet-4.6. Gateway-reported costs are recorded;
          other providers need configured token pricing.
        </p>
        <Button className="self-start" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </>
  );
}
