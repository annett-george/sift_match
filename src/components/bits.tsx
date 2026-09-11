import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Breakdown, Recommendation } from "@/lib/types";

export function RecommendationBadge({ value }: { value: Recommendation }) {
  const styles: Record<Recommendation, string> = {
    Strong: "bg-strong/12 text-strong border-strong/30",
    Moderate: "bg-moderate/15 text-moderate border-moderate/35",
    Weak: "bg-weak/12 text-weak border-weak/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[value],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

export function ScoreDial({ score, size = 88 }: { score: number; size?: number }) {
  const color = score >= 80 ? "var(--strong)" : score >= 60 ? "var(--moderate)" : "var(--weak)";
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${score * 3.6}deg, var(--muted) 0deg)`,
      }}
      role="img"
      aria-label={`Match score ${score} out of 100`}
    >
      <div className="grid place-items-center rounded-full bg-card" style={{ width: size - 16, height: size - 16 }}>
        <span className="font-display text-xl font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

export function BreakdownBars({ breakdown }: { breakdown: Breakdown[] }) {
  return (
    <div className="space-y-3">
      {breakdown.map((b) => (
        <div key={b.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{b.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {b.points}/{b.max}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(b.raw * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint: string; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "strong" | "moderate" | "weak";
}) {
  const tones = {
    default: "text-primary bg-primary/10",
    strong: "text-strong bg-strong/12",
    moderate: "text-moderate bg-moderate/15",
    weak: "text-weak bg-weak/12",
  } as const;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <span className={cn("grid h-9 w-9 place-items-center rounded-lg", tones[tone])}>{icon}</span> : null}
      </div>
    </div>
  );
}

export function Avatar({ initials, blind }: { initials: string; blind: boolean }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
        blind ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      )}
    >
      {initials}
    </span>
  );
}
