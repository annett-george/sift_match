import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, RecommendationBadge } from "@/components/bits";
import { maskName, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Candidate Comparison — SiftMatch" },
      {
        name: "description",
        content: "Compare shortlisted candidates side by side for any role across scores, strengths, gaps and education.",
      },
      { property: "og:title", content: "Candidate Comparison — SiftMatch" },
      { property: "og:description", content: "Side-by-side matrix comparison of shortlisted candidates." },
    ],
  }),
  component: Comparison,
});

function Comparison() {
  const { candidates, jobs, matches, blindMode } = useStore();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const jobMatches = useMemo(
    () => matches.filter((m) => m.jobId === jobId).sort((a, b) => b.score - a.score),
    [matches, jobId],
  );
  const [selected, setSelected] = useState<string[]>(() => jobMatches.slice(0, 3).map((m) => m.candidateId));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 4 ? [...prev, id] : prev));

  const cols = selected
    .map((id) => ({
      candidate: candidates.find((c) => c.id === id)!,
      match: jobMatches.find((m) => m.candidateId === id)!,
    }))
    .filter((c) => c.candidate && c.match);

  return (
    <div>
      <PageHeader
        title="Comparison"
        subtitle="Pick up to four candidates for a role and compare them across every scoring dimension."
        actions={
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setSelected(
                matches
                  .filter((m) => m.jobId === e.target.value)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
                  .map((m) => m.candidateId),
              );
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        }
      />

      <section className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Select candidates ({selected.length}/4)
        </p>
        <div className="flex flex-wrap gap-2">
          {jobMatches.map((m) => {
            const c = candidates.find((x) => x.id === m.candidateId)!;
            const on = selected.includes(c.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(c.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {maskName(c.name, blindMode, c.id)} · {m.score}
              </button>
            );
          })}
        </div>
      </section>

      {cols.length === 0 ? (
        <EmptyState title="Nothing selected" hint="Choose at least one candidate above to build the comparison matrix." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="w-44 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Dimension</th>
                {cols.map(({ candidate, match }) => (
                  <th key={candidate.id} className="px-4 py-3">
                    <Link
                      to="/candidates/$candidateId"
                      params={{ candidateId: candidate.id }}
                      search={{ job: jobId }}
                      className="font-display font-semibold hover:text-primary"
                    >
                      {maskName(candidate.name, blindMode, candidate.id)}
                    </Link>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">{candidate.title}</p>
                    <p className="mt-1 font-display text-xl font-bold tabular-nums">{match.score}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Recommendation" cols={cols} render={({ match }) => <RecommendationBadge value={match.recommendation} />} />
              {cols[0]?.match.breakdown.map((b, i) => (
                <Row
                  key={b.key}
                  label={`${b.label} (/${b.max})`}
                  cols={cols}
                  render={({ match }) => <span className="tabular-nums">{match.breakdown[i]?.points}</span>}
                />
              ))}
              <Row label="Experience" cols={cols} render={({ candidate }) => <span>{candidate.years} years</span>} />
              <Row
                label="Education"
                cols={cols}
                render={({ candidate }) => (
                  <span>
                    {candidate.education.degree}, {candidate.education.field}
                  </span>
                )}
              />
              <Row
                label="Strengths"
                cols={cols}
                render={({ match }) => (
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {match.strengths.slice(0, 3).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              />
              <Row
                label="Gaps"
                cols={cols}
                render={({ match }) =>
                  match.missingMustHave.length ? (
                    <div className="flex flex-wrap gap-1">
                      {match.missingMustHave.map((s) => (
                        <span key={s} className="rounded-full bg-weak/12 px-2 py-0.5 text-xs text-weak">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-strong">No must-have gaps</span>
                  )
                }
              />
              <Row label="Confidence" cols={cols} render={({ match }) => <span>{match.confidence}%</span>} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Col = { candidate: import("@/lib/types").Candidate; match: import("@/lib/types").MatchResult };

function Row({ label, cols, render }: { label: string; cols: Col[]; render: (c: Col) => React.ReactNode }) {
  return (
    <tr className="border-t border-border align-top">
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</th>
      {cols.map((c) => (
        <td key={c.candidate.id} className="px-4 py-3">
          {render(c)}
        </td>
      ))}
    </tr>
  );
}
