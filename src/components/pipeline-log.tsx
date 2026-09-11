import { CheckCircle2, Workflow } from "lucide-react";

import type { PipelineStage } from "@/lib/store";
import { DISCLAIMER } from "@/lib/scoring";

export function PipelineLog({ stages }: { stages: PipelineStage[] }) {
  if (stages.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <Workflow className="h-4 w-4 text-primary" /> Multi-Agent Pipeline
      </h2>
      <p className="text-xs text-muted-foreground">Orchestrator run — every agent output is inspectable</p>
      <ol className="mt-4 space-y-3">
        {stages.map((s, i) => (
          <li key={s.agent} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-strong/12 text-strong">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              {i < stages.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium">
                {i + 1}. {s.agent}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{s.at}</span>
              </p>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{DISCLAIMER}</p>
    </section>
  );
}
