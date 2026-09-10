"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { analysisSchema, critiqueSchema } from "@/lib/ai/schemas";
import { snapshotSchema, type BusinessSnapshot } from "@/lib/business/types";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
export function timestamp(value: number) {
  return (
    new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC"
  );
}
export function money(value: number | null, currency = "USD") {
  return value === null
    ? "Unknown"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
}
export function MetricsView({
  snapshot,
}: {
  snapshot: BusinessSnapshot | null;
}) {
  if (!snapshot)
    return (
      <p className="muted">
        No metric snapshot yet. Run an analysis to collect company data.
      </p>
    );
  return (
    <div className="stack">
      <p className="muted">
        Captured {timestamp(snapshot.capturedAt)}. Periods are shown explicitly;
        unknown values are never replaced with zero.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric / source</th>
              <th>Value</th>
              <th>Period</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.metrics.map((m) => (
              <tr key={m.key}>
                <td>
                  {m.metric}
                  <p className="muted text-xs">{m.source}</p>
                </td>
                <td className="whitespace-nowrap">
                  {m.unit === "USD"
                    ? money(m.value)
                    : m.unit === "ratio"
                      ? `${(m.value * 100).toFixed(1)}%`
                      : m.value.toLocaleString("en-US")}
                  <p className="muted text-xs">{m.unit}</p>
                </td>
                <td className="text-xs">
                  {m.periodStart === m.periodEnd
                    ? "Point in time"
                    : `${new Date(m.periodStart).toISOString().slice(0, 10)} → ${new Date(m.periodEnd).toISOString().slice(0, 10)} (end exclusive)`}
                  <p className="muted">Captured {timestamp(m.capturedAt)}</p>
                </td>
                <td className="text-xs">{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Historical comparison</h2>
      {snapshot.comparisons.length ? (
        snapshot.comparisons.map((c, i) => (
          <p key={i}>
            {c.metric}: {c.current.toFixed(2)} vs {c.previous.toFixed(2)}{" "}
            <Badge variant="secondary">
              {c.changePercent === null
                ? "No percentage baseline"
                : `${c.changePercent > 0 ? "+" : ""}${c.changePercent.toFixed(1)}%`}
            </Badge>
          </p>
        ))
      ) : (
        <p className="muted">No comparable previous period is available.</p>
      )}
    </div>
  );
}
export function AnalysisView({ run }: { run: Doc<"runs"> }) {
  const a = run.analysisJson
      ? analysisSchema.parse(JSON.parse(run.analysisJson))
      : null,
    c = run.critiqueJson
      ? critiqueSchema.parse(JSON.parse(run.critiqueJson))
      : null;
  if (!a)
    return (
      <p className="muted">
        {run.status === "running"
          ? "Collecting data and reviewing the recommendation…"
          : "No accepted analysis for this run. Review the snapshot and event history below."}
      </p>
    );
  return (
    <>
      <section className="section">
        <h2>Current bottleneck</h2>
        <p>{a.currentBottleneck.statement}</p>
        <p className="evidence">
          Evidence: {a.currentBottleneck.evidence.join(" · ")}
        </p>
      </section>
      <section className="section">
        <h2>Observations</h2>
        {a.observations.map((o, i) => (
          <article key={i}>
            <p>{o.statement}</p>
            <p className="evidence">{o.evidence.join(" · ")}</p>
          </article>
        ))}
      </section>
      <section className="section">
        <h2>Hypotheses</h2>
        {a.hypotheses.map((h, i) => (
          <article key={i}>
            <p>{h.statement}</p>
            <p className="muted">
              {Math.round(h.confidence * 100)}% confidence · Untested ·
              Observations {h.observationIndexes.map((n) => n + 1).join(", ")}
            </p>
          </article>
        ))}
      </section>
      <section className="section">
        <h2>Ranked opportunities</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Score</th>
                <th>Impact</th>
                <th>Confidence</th>
                <th>Urgency</th>
                <th>Effort / cost</th>
              </tr>
            </thead>
            <tbody>
              {a.opportunities.map((o, i) => (
                <tr key={i}>
                  <td>
                    {o.title}
                    <p className="muted text-xs">{o.description}</p>
                  </td>
                  <td>{o.score.toFixed(2)}</td>
                  <td>{o.estimatedImpact}</td>
                  <td>{Math.round(o.confidence * 100)}%</td>
                  <td>{o.urgencyMultiplier}</td>
                  <td>
                    {o.effort} / {money(o.estimatedCostUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section">
        <div className="inline">
          <h2>Recommended experiment</h2>
          <Badge variant="secondary">Proposed</Badge>
        </div>
        <h3>{a.recommendedExperiment.title}</h3>
        <p>{a.recommendedExperiment.proposedChange}</p>
        <p>
          Hypothesis:{" "}
          {a.hypotheses[a.recommendedExperiment.hypothesisIndex].statement}
        </p>
        <p>
          {a.recommendedExperiment.successMetric}:{" "}
          {a.recommendedExperiment.baseline ?? "Unknown"} →{" "}
          {a.recommendedExperiment.target ?? "Target not specified"} (
          {a.recommendedExperiment.direction})
        </p>
        <p>{a.recommendedExperiment.measurementPlan}</p>
        <p className="muted">
          Estimated cost {money(a.recommendedExperiment.estimatedCostUsd)} ·{" "}
          {Math.round(a.recommendedExperiment.confidence * 100)}% confidence
        </p>
        <p>{a.recommendedExperiment.expectedImpact}</p>
      </section>
      <section className="section">
        <h2>Critic review</h2>
        <p>
          {c?.accepted ? "Accepted" : "Not accepted"} · Severity: {c?.severity}
        </p>
        {c?.issues.map((issue, i) => (
          <p key={i}>{issue}</p>
        ))}
      </section>
      <section className="section">
        <h2>Assumptions</h2>
        {a.assumptions.length ? (
          a.assumptions.map((s, i) => <p key={i}>{s}</p>)
        ) : (
          <p className="muted">None recorded.</p>
        )}
        <h2>Missing information</h2>
        {a.missingInformation.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </section>
    </>
  );
}
export function RunDetail({ runId }: { runId: Id<"runs"> }) {
  const raw = useQuery(api.runs.detail, { runId });
  if (!raw) return <Skeleton className="h-32 w-full" />;
  const { run, events, usage } = JSON.parse(raw) as {
    run: Doc<"runs">;
    events: Doc<"events">[];
    usage: Doc<"modelUsage">[];
  };
  const snapshot = run.snapshotJson
    ? snapshotSchema.parse(JSON.parse(run.snapshotJson))
    : null;
  return (
    <>
      <Link href="/runs">← All runs</Link>
      <div className="page-head mt-5">
        <div>
          <h1>Run {run._id.slice(-6)}</h1>
          <p className="muted">
            {timestamp(run.startedAt)} · {run.provider} / {run.model}
          </p>
        </div>
        <Badge variant="secondary">{run.status}</Badge>
      </div>
      {run.error ? (
        <Alert variant="destructive">
          <AlertTitle>Analysis stopped</AlertTitle>
          <AlertDescription>{run.error}</AlertDescription>
        </Alert>
      ) : null}
      <p>{run.summary}</p>
      <p className="muted">
        {run.completedAt
          ? `Completed ${timestamp(run.completedAt)}`
          : "In progress"}{" "}
        · {run.inputTokens.toLocaleString()} input /{" "}
        {run.outputTokens.toLocaleString()} output tokens · Model cost{" "}
        {run.costUsd === null
          ? "Unknown — configure model pricing"
          : `$${run.costUsd.toFixed(4)}`}
      </p>
      <AnalysisView run={run} />
      <section className="section">
        <h2>Business snapshot</h2>
        <MetricsView snapshot={snapshot} />
        {snapshot?.missingInformation.map((s, i) => (
          <p className="muted" key={i}>
            {s}
          </p>
        ))}
      </section>
      <section className="section">
        <h2>Event history</h2>
        {events.map((e) => (
          <details key={e._id}>
            <summary>
              {e.type}{" "}
              <span className="muted text-xs">{timestamp(e.timestamp)}</span>
            </summary>
            <pre>{JSON.stringify(JSON.parse(e.payloadJson), null, 2)}</pre>
          </details>
        ))}
      </section>
      <section className="section">
        <h2>Model usage and retries</h2>
        {usage.map((u) => (
          <p key={u._id}>
            {u.stage}, attempt {u.attempt} · {u.inputTokens} input /{" "}
            {u.outputTokens} output · {(u.durationMs / 1000).toFixed(1)}s ·{" "}
            {u.costUsd === null ? "Cost unknown" : `$${u.costUsd.toFixed(4)}`}
          </p>
        ))}
      </section>
    </>
  );
}
