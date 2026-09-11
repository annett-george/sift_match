import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Gauge, Layers, Users } from "lucide-react";

import { Avatar, PageHeader, RecommendationBadge, StatCard } from "@/components/bits";
import { maskInitials, maskName, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SiftMatch AI Resume Screening" },
      {
        name: "description",
        content:
          "Screening overview: resumes processed, open roles, match distribution and the top ranked candidates across every job.",
      },
      { property: "og:title", content: "SiftMatch Dashboard" },
      {
        property: "og:description",
        content: "Live recruiter overview of resumes, jobs, match scores and top ranked candidates.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { candidates, jobs, matches, blindMode } = useStore();

  const strong = matches.filter((m) => m.recommendation === "Strong").length;
  const moderate = matches.filter((m) => m.recommendation === "Moderate").length;
  const weak = matches.filter((m) => m.recommendation === "Weak").length;
  const avg = matches.length
    ? Math.round(matches.reduce((s, m) => s + m.score, 0) / matches.length)
    : 0;

  const top = [...matches].sort((a, b) => b.score - a.score).slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Screening Dashboard"
        subtitle="Deterministic scoring across every candidate-job pair, refreshed live."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Resumes" value={candidates.length} hint="Profiles in the talent pool" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Open Jobs" value={jobs.length} hint="Roles being screened" icon={<Briefcase className="h-4 w-4" />} />
        <StatCard label="Matches" value={matches.length} hint="Candidate × job evaluations" icon={<Layers className="h-4 w-4" />} />
        <StatCard label="Average Score" value={`${avg}/100`} hint="Across all matches" icon={<Gauge className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Strong (≥80)" value={strong} tone="strong" icon={<span className="text-xs font-bold">S</span>} />
        <StatCard label="Moderate (60–79)" value={moderate} tone="moderate" icon={<span className="text-xs font-bold">M</span>} />
        <StatCard label="Weak (&lt;60)" value={weak} tone="weak" icon={<span className="text-xs font-bold">W</span>} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <header className="border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">Top Ranked Candidates</h2>
            <p className="text-xs text-muted-foreground">Highest deterministic scores across all open roles</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Candidate</th>
                  <th className="px-5 py-2.5 font-medium">Role</th>
                  <th className="px-5 py-2.5 font-medium">Score</th>
                  <th className="px-5 py-2.5 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {top.map((m) => {
                  const cand = candidates.find((c) => c.id === m.candidateId)!;
                  const job = jobs.find((j) => j.id === m.jobId)!;
                  return (
                    <tr key={m.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <Link
                          to="/candidates/$candidateId"
                          params={{ candidateId: cand.id }}
                          search={{ job: job.id }}
                          className="flex items-center gap-3 font-medium text-foreground hover:text-primary"
                        >
                          <Avatar initials={maskInitials(cand.name, blindMode)} blind={blindMode} />
                          {maskName(cand.name, blindMode, cand.id)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{job.title}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{m.score}</td>
                      <td className="px-5 py-3">
                        <RecommendationBadge value={m.recommendation} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold">Open Roles</h2>
          <p className="text-xs text-muted-foreground">Applicant tallies by recommendation</p>
          <ul className="mt-4 space-y-4">
            {jobs.map((job) => {
              const jm = matches.filter((m) => m.jobId === job.id);
              return (
                <li key={job.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.department} · {job.location}
                      </p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">{jm.length} applicants</span>
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="rounded-md bg-strong/12 px-2 py-1 font-medium text-strong">
                      {jm.filter((m) => m.recommendation === "Strong").length} strong
                    </span>
                    <span className="rounded-md bg-moderate/15 px-2 py-1 font-medium text-moderate">
                      {jm.filter((m) => m.recommendation === "Moderate").length} moderate
                    </span>
                    <span className="rounded-md bg-weak/12 px-2 py-1 font-medium text-weak">
                      {jm.filter((m) => m.recommendation === "Weak").length} weak
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
