import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, EmptyState, PageHeader, RecommendationBadge } from "@/components/bits";
import { DEFAULT_WEIGHTS, WEIGHT_LABELS } from "@/lib/scoring";
import { maskInitials, maskName, useStore } from "@/lib/store";
import type { Recommendation, Weights } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Candidate Rankings — SiftMatch" },
      {
        name: "description",
        content: "Filter, sort and search ranked candidates per role, with what-if weighting and natural language recruiter search.",
      },
      { property: "og:title", content: "Candidate Rankings — SiftMatch" },
      { property: "og:description", content: "Ranked candidate shortlists with live what-if scoring." },
    ],
  }),
  component: Rankings,
});

type SortKey = "score" | "name" | "years";

function Rankings() {
  const { candidates, jobs, weights, matchesWith, blindMode } = useStore();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [minScore, setMinScore] = useState(0);
  const [rec, setRec] = useState<Recommendation | "All">("All");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [whatIf, setWhatIf] = useState<Weights | null>(null);
  const [query, setQuery] = useState("");
  const [parsed, setParsed] = useState<{ skills: string[]; years: number | null } | null>(null);

  const activeWeights = whatIf ?? weights;
  const total = Object.values(activeWeights).reduce((a, b) => a + b, 0);
  const results = useMemo(() => matchesWith(activeWeights), [matchesWith, activeWeights]);

  const rows = useMemo(() => {
    const list = results
      .filter((m) => m.jobId === jobId)
      .filter((m) => m.score >= minScore)
      .filter((m) => rec === "All" || m.recommendation === rec)
      .filter((m) => {
        if (!skill.trim()) return true;
        const c = candidates.find((x) => x.id === m.candidateId);
        return c?.skills.some((s) => s.toLowerCase().includes(skill.trim().toLowerCase()));
      })
      .map((m) => ({ match: m, candidate: candidates.find((c) => c.id === m.candidateId)! }));

    return list.sort((a, b) => {
      const dir = asc ? 1 : -1;
      if (sort === "score") return (a.match.score - b.match.score) * dir;
      if (sort === "years") return (a.candidate.years - b.candidate.years) * dir;
      return a.candidate.name.localeCompare(b.candidate.name) * dir;
    });
  }, [results, jobId, minScore, rec, skill, candidates, sort, asc]);

  const vocab = useMemo(
    () => Array.from(new Set(candidates.flatMap((c) => c.skills))),
    [candidates],
  );

  const runSearch = () => {
    if (!query.trim()) {
      setParsed(null);
      return;
    }
    const q = query.toLowerCase();
    const skills = vocab.filter((s) => q.includes(s.toLowerCase()));
    const yearsMatch = q.match(/(\d+)\s*\+?\s*(?:years|yrs|year)/);
    const years = yearsMatch?.[1] ? Number(yearsMatch[1]) : null;
    setParsed({ skills, years });
    if (skills.length === 0 && years === null) toast.error("No skills or experience found in that query.");
  };

  const nlResults = useMemo(() => {
    if (!parsed) return [];
    return candidates
      .filter((c) => parsed.skills.every((s) => c.skills.some((cs) => cs.toLowerCase() === s.toLowerCase())))
      .filter((c) => (parsed.years === null ? true : c.years >= parsed.years))
      .sort((a, b) => b.years - a.years);
  }, [parsed, candidates]);

  const setWeight = (key: keyof Weights, value: number) =>
    setWhatIf({ ...(whatIf ?? weights), [key]: value });

  return (
    <div>
      <PageHeader
        title="Candidate Rankings"
        subtitle="Deterministic scores per role, filterable and sortable, with live what-if weighting."
      />

      <section className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            className="min-w-56 flex-1"
            placeholder="Find candidates with Python, PyTorch and 3+ years experience"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <Button onClick={runSearch}>Search</Button>
          {parsed ? (
            <Button
              variant="ghost"
              onClick={() => {
                setParsed(null);
                setQuery("");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
        {parsed ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Parsed criteria</p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.skills.map((s) => (
                <span key={s} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {s}
                </span>
              ))}
              {parsed.years !== null ? (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  ≥ {parsed.years} years
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground">{nlResults.length} candidate(s) matched:</p>
            <div className="flex flex-wrap gap-2">
              {nlResults.map((c) => (
                <Link
                  key={c.id}
                  to="/candidates/$candidateId"
                  params={{ candidateId: c.id }}
                  search={{ job: jobId }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
                >
                  {maskName(c.name, blindMode, c.id)} · {c.years}y
                </Link>
              ))}
              {nlResults.length === 0 ? <span className="text-xs text-muted-foreground">No matches.</span> : null}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Minimum score: {minScore}
                </span>
                <Slider value={[minScore]} min={0} max={100} step={5} onValueChange={([v]) => setMinScore(v ?? 0)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendation</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={rec}
                  onChange={(e) => setRec(e.target.value as Recommendation | "All")}
                >
                  {["All", "Strong", "Moderate", "Weak"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Skill contains</span>
                <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. PyTorch" />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">
                      <SortButton label="Candidate" active={sort === "name"} onClick={() => (setSort("name"), setAsc(sort === "name" ? !asc : true))} />
                    </th>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">
                      <SortButton label="Years" active={sort === "years"} onClick={() => (setSort("years"), setAsc(sort === "years" ? !asc : false))} />
                    </th>
                    <th className="px-4 py-2.5">
                      <SortButton label="Score" active={sort === "score"} onClick={() => (setSort("score"), setAsc(sort === "score" ? !asc : false))} />
                    </th>
                    <th className="px-4 py-2.5">Recommendation</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ match, candidate }) => (
                    <tr key={match.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 font-medium">
                          <Avatar initials={maskInitials(candidate.name, blindMode)} blind={blindMode} />
                          {maskName(candidate.name, blindMode, candidate.id)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{candidate.title}</td>
                      <td className="px-4 py-3 tabular-nums">{candidate.years}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{match.score}</td>
                      <td className="px-4 py-3">
                        <RecommendationBadge value={match.recommendation} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/candidates/$candidateId"
                          params={{ candidateId: candidate.id }}
                          search={{ job: jobId }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          View detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No candidates match these filters" hint="Lower the minimum score or clear the skill filter." />
              </div>
            ) : null}
          </section>
        </div>

        <section className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> What-If Analysis
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Re-weight the model in memory. Baseline records are never changed.
          </p>
          <div className="mt-4 space-y-4">
            {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map((key) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{WEIGHT_LABELS[key]}</span>
                  <span className="tabular-nums text-muted-foreground">{activeWeights[key]}%</span>
                </div>
                <Slider
                  value={[activeWeights[key]]}
                  min={0}
                  max={60}
                  step={1}
                  onValueChange={([v]) => setWeight(key, v ?? 0)}
                />
              </div>
            ))}
          </div>
          <p className={cn("mt-4 text-sm font-semibold", total === 100 ? "text-strong" : "text-weak")}>
            Total: {total}% {total === 100 ? "✓" : "— must sum to 100%"}
          </p>
          <Button variant="outline" className="mt-3 w-full" onClick={() => setWhatIf(null)} disabled={!whatIf}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset to baseline
          </Button>
        </section>
      </div>
    </div>
  );
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-1 font-medium uppercase tracking-wide", active && "text-primary")}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}
