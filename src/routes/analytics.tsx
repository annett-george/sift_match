import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, StatCard } from "@/components/bits";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Screening Analytics — SiftMatch" },
      {
        name: "description",
        content: "Score distribution, most common skills, top skill gaps and recommendation splits across the talent pool.",
      },
      { property: "og:title", content: "Screening Analytics — SiftMatch" },
      { property: "og:description", content: "Charts covering score distribution, skills and gaps." },
    ],
  }),
  component: Analytics,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Analytics() {
  const { matches, candidates } = useStore();

  const buckets = useMemo(() => {
    const ranges = [
      [0, 19],
      [20, 39],
      [40, 59],
      [60, 79],
      [80, 100],
    ];
    return ranges.map(([lo, hi]) => ({
      range: `${lo}-${hi}`,
      count: matches.filter((m) => m.score >= (lo as number) && m.score <= (hi as number)).length,
    }));
  }, [matches]);

  const recSplit = useMemo(
    () =>
      (["Strong", "Moderate", "Weak"] as const).map((r) => ({
        name: r,
        value: matches.filter((m) => m.recommendation === r).length,
      })),
    [matches],
  );

  const commonSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) for (const s of c.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));
  }, [candidates]);

  const topGaps = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) for (const s of m.missingMustHave) counts.set(s, (counts.get(s) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));
  }, [matches]);

  const avgExp = matches.length
    ? Math.round(matches.reduce((s, m) => s + m.experienceMatchPct, 0) / matches.length)
    : 0;
  const avgScore = matches.length ? Math.round(matches.reduce((s, m) => s + m.score, 0) / matches.length) : 0;
  const avgConf = matches.length ? Math.round(matches.reduce((s, m) => s + m.confidence, 0) / matches.length) : 0;

  const recColor = (name: string) =>
    name === "Strong" ? "var(--strong)" : name === "Moderate" ? "var(--moderate)" : "var(--weak)";

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Distribution of scores, skills and gaps across all screened matches." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Average match score" value={`${avgScore}/100`} />
        <StatCard label="Average experience match" value={`${avgExp}%`} />
        <StatCard label="Average confidence" value={`${avgConf}%`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Score distribution" hint="Matches per score band">
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Recommendation split" hint="Strong / Moderate / Weak across all matches">
          <PieChart>
            <Pie data={recSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
              {recSplit.map((entry) => (
                <Cell key={entry.name} fill={recColor(entry.name)} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ChartCard>

        <ChartCard title="Most common skills" hint="Across the talent pool">
          <BarChart data={commonSkills} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="skill" width={110} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {commonSkills.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Top must-have skill gaps" hint="Requirements most often missing">
          <BarChart data={topGaps} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="skill" width={110} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" fill="var(--weak)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint: string; children: React.ReactElement }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{hint}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
