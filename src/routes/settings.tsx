import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Cpu, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/bits";
import { DEFAULT_WEIGHTS, DISCLAIMER, WEIGHT_LABELS } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import type { Weights } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SiftMatch" },
      {
        name: "description",
        content: "Configure scoring weights, blind screening and review the active screening mode and system status.",
      },
      { property: "og:title", content: "Settings — SiftMatch" },
      { property: "og:description", content: "Scoring weights, blind screening and system status." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { weights, setWeights, resetWeights, blindMode, setBlindMode, aiMode, candidates, jobs, matches, feedback } =
    useStore();
  const [draft, setDraft] = useState<Weights>(weights);
  const total = Object.values(draft).reduce((a, b) => a + b, 0);

  const save = () => {
    if (total !== 100) {
      toast.error("Weights must sum to exactly 100%.");
      return;
    }
    setWeights(draft);
    toast.success("Scoring weights updated — all matches rescored.");
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Screening mode, scoring model and system status." />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div>
            <h2 className="font-display text-base font-semibold">Scoring weights</h2>
            <p className="text-xs text-muted-foreground">
              The final score is computed deterministically in application code from these weights.
            </p>
          </div>
          {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map((key) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{WEIGHT_LABELS[key]}</span>
                <span className="tabular-nums text-muted-foreground">{draft[key]}%</span>
              </div>
              <Slider
                value={[draft[key]]}
                min={0}
                max={60}
                step={1}
                onValueChange={([v]) => setDraft({ ...draft, [key]: v ?? 0 })}
              />
            </div>
          ))}
          <p className={cn("text-sm font-semibold", total === 100 ? "text-strong" : "text-weak")}>
            Total: {total}% {total === 100 ? "✓" : "— must equal 100%"}
          </p>
          <div className="flex gap-2">
            <Button onClick={save}>Save weights</Button>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(DEFAULT_WEIGHTS);
                resetWeights();
                toast.success("Restored the default 40/25/15/10/5/5 model.");
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Restore defaults
            </Button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Active mode
            </h2>
            <p
              className={cn(
                "mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                aiMode ? "border-strong/30 bg-strong/10 text-strong" : "border-primary/25 bg-primary/10 text-primary",
              )}
            >
              {aiMode ? "AI Mode" : "Demo Mode"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {aiMode
                ? "Server-side LLM calls are enabled for agent narratives. API keys stay on the server."
                : "Running the seeded deterministic pipeline. Add an OPENAI_API_KEY on the server to enable AI Mode."}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-muted-foreground" /> Model: <strong>GPT-6 Astra</strong>
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Blind screening</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Hides names, avatars, age, gender and contact details across every page.
            </p>
            <label className="mt-3 flex items-center gap-3 text-sm">
              <Switch checked={blindMode} onCheckedChange={setBlindMode} aria-label="Blind screening" />
              {blindMode ? "On" : "Off"}
            </label>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">System status</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["Scoring engine", `${matches.length} matches computed`],
                ["Resume pool", `${candidates.length} profiles`],
                ["Job pool", `${jobs.length} roles`],
                ["Feedback log", `${feedback.length} decisions recorded`],
              ].map(([label, value]) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-strong" />
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{DISCLAIMER}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
