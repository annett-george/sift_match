import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Quote, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, BreakdownBars, PageHeader, RecommendationBadge, ScoreDial } from "@/components/bits";
import { DISCLAIMER } from "@/lib/scoring";
import { maskInitials, maskName, maskText, useStore } from "@/lib/store";
import type { FeedbackStatus } from "@/lib/types";

export const Route = createFileRoute("/candidates/$candidateId")({
  validateSearch: (search: Record<string, unknown>) => ({
    job: typeof search["job"] === "string" ? (search["job"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Candidate Detail — SiftMatch" },
      {
        name: "description",
        content: "Full candidate profile with deterministic score breakdown, evidence quotes, skill gaps and interview questions.",
      },
      { property: "og:title", content: "Candidate Detail — SiftMatch" },
      { property: "og:description", content: "Evidence-backed candidate scorecard for recruiters." },
    ],
  }),
  component: CandidateDetail,
});

function CandidateDetail() {
  const { candidateId } = Route.useParams();
  const { job: jobParam } = Route.useSearch();
  const { candidates, jobs, matches, blindMode, saveFeedback, feedbackFor } = useStore();

  const candidate = candidates.find((c) => c.id === candidateId);
  if (!candidate) throw notFound();

  const [jobId, setJobId] = useState(jobParam || jobs[0]?.id || "");
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0]!;
  const match = matches.find((m) => m.candidateId === candidate.id && m.jobId === job.id)!;

  const existing = feedbackFor(candidate.id, job.id);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const submit = (status: FeedbackStatus) => {
    saveFeedback({ candidateId: candidate.id, jobId: job.id, status, notes });
    toast.success(`Logged "${status}" for this candidate on ${job.title}.`);
  };

  return (
    <div>
      <Link to="/rankings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to rankings
      </Link>

      <PageHeader
        title={maskName(candidate.name, blindMode, candidate.id)}
        subtitle={`${candidate.title} · ${candidate.years} years · ${blindMode ? "location hidden" : candidate.location}`}
        actions={
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Target role</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={job.id}
              onChange={(e) => setJobId(e.target.value)}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-5">
              <ScoreDial score={match.score} />
              <div className="min-w-48 flex-1">
                <div className="flex items-center gap-3">
                  <Avatar initials={maskInitials(candidate.name, blindMode)} blind={blindMode} />
                  <div>
                    <p className="font-semibold">{maskName(candidate.name, blindMode, candidate.id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {maskText(candidate.email, blindMode)} · {maskText(candidate.phone, blindMode)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {blindMode ? "Age & gender hidden" : `${candidate.age} · ${candidate.gender}`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <RecommendationBadge value={match.recommendation} />
                  <span className="text-xs text-muted-foreground">Confidence {match.confidence}%</span>
                  <span className="text-xs text-muted-foreground">Experience match {match.experienceMatchPct}%</span>
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm text-foreground">{candidate.summary}</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Deterministic score breakdown</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Computed in application code — never generated by the model.
            </p>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {match.breakdown.map((b) => (
                <div key={b.key} className="rounded-lg border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{b.label}</p>
                  <p className="font-display text-lg font-bold tabular-nums">
                    {b.points}
                    <span className="text-sm font-medium text-muted-foreground">/{b.max}</span>
                  </p>
                </div>
              ))}
            </div>
            <BreakdownBars breakdown={match.breakdown} />
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Matching skills & evidence</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {match.matchingSkills.map((s) => (
                <span key={s} className="rounded-full bg-strong/12 px-2.5 py-0.5 text-xs font-medium text-strong">
                  {s}
                </span>
              ))}
              {match.matchingSkills.length === 0 ? (
                <span className="text-sm text-muted-foreground">No overlapping skills found for this role.</span>
              ) : null}
            </div>
            <ul className="mt-4 space-y-3">
              {match.evidence.map((e) => (
                <li key={e.skill} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-primary">{e.skill}</p>
                  <p className="mt-1 flex gap-2 text-sm italic text-foreground">
                    <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    “{e.quote}”
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.where}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Skill gaps</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <GapList title="Missing must-have" items={match.missingMustHave} tone="weak" />
              <GapList title="Missing nice-to-have" items={match.missingNiceToHave} tone="moderate" />
            </div>
            {match.learningAreas.length ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Learning areas</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {match.learningAreas.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Experience, projects & certifications</h2>
            <div className="mt-4 space-y-4">
              {candidate.experience.map((e) => (
                <div key={`${e.company}-${e.role}`} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">
                    {e.role} · {e.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.start} – {e.end} · {e.years} years
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {e.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {candidate.projects.map((p) => (
                <div key={p.name} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Education</p>
                <p className="mt-1 font-medium">
                  {candidate.education.degree} in {candidate.education.field}
                </p>
                <p className="text-xs text-muted-foreground">
                  {candidate.education.school} · {candidate.education.year}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Certifications</p>
                {candidate.certifications.length ? (
                  <ul className="mt-1 list-disc pl-4">
                    {candidate.certifications.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted-foreground">None listed</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Recruiter Agent summary
            </h2>
            <p className="mt-2 text-sm text-foreground">{match.summary}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {match.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {match.weaknesses.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {DISCLAIMER}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Interview questions</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              {match.interviewQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Recruiter feedback</h2>
            {existing ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Last logged: <span className="font-semibold text-foreground">{existing.status}</span> ·{" "}
                {new Date(existing.at).toLocaleString()}
              </p>
            ) : null}
            <Textarea
              className="mt-3"
              rows={4}
              placeholder="Notes for the hiring team…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => submit("Accept")}>Accept</Button>
              <Button variant="outline" onClick={() => submit("Needs Review")}>
                Needs Review
              </Button>
              <Button variant="destructive" onClick={() => submit("Reject")}>
                Reject
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function GapList({ title, items, tone }: { title: string; items: string[]; tone: "weak" | "moderate" }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None — fully covered.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <span
              key={s}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tone === "weak" ? "bg-weak/12 text-weak" : "bg-moderate/15 text-moderate"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
