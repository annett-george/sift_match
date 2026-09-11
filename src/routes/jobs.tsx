import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/bits";
import { PipelineLog } from "@/components/pipeline-log";
import { useStore } from "@/lib/store";
import type { Job } from "@/lib/types";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Job Descriptions — SiftMatch" },
      {
        name: "description",
        content: "Paste or upload job specs and let the Job Agent extract must-have skills, responsibilities and the education bar.",
      },
      { property: "og:title", content: "Job Descriptions — SiftMatch" },
      { property: "og:description", content: "Structured requirement extraction for every open role." },
    ],
  }),
  component: Jobs,
});

function parseJob(title: string, text: string, id: string): Job {
  const lines = text
    .split(/\n|•|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  const skillLine = lines.find((l) => /skill|require|proficien/i.test(l)) ?? "";
  const skills = skillLine
    .replace(/^[^:]*:/, "")
    .split(/,|\//)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 30);
  const yearsMatch = text.match(/(\d+)\+?\s*years?/i);
  const responsibilities = lines.filter((l) => /^(build|design|develop|own|lead|deploy|analys|analyz|ship|partner|collaborat)/i.test(l));

  return {
    id,
    title: title.trim() || "Untitled Role",
    department: "Uploaded",
    location: "Not stated",
    employmentType: "Full-time",
    description: text.slice(0, 600),
    minYears: yearsMatch?.[1] ? Number(yearsMatch[1]) : 3,
    mustHave: skills.slice(0, 5).length ? skills.slice(0, 5) : ["Python", "SQL"],
    niceToHave: skills.slice(5, 9),
    responsibilities: responsibilities.length ? responsibilities.slice(0, 6) : lines.slice(0, 4),
    educationLevel: /master|m\.?tech|m\.?sc/i.test(text) ? "Masters" : "Bachelors",
    educationField: /statistic/i.test(text) ? "Statistics" : "Computer Science",
    certifications: [],
    projectKeywords: skills.slice(0, 4).map((s) => s.toLowerCase()),
    source: "upload",
  };
}

function Jobs() {
  const { jobs, addJob, runPipeline, pipeline, matches } = useStore();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(jobs[0]?.id ?? "");

  const active = jobs.find((j) => j.id === selected) ?? jobs[0];

  const process = () => {
    if (text.trim().length < 40) {
      toast.error("Paste a job description of at least a few sentences.");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      const job = parseJob(title, text, `job-${Date.now()}`);
      addJob(job);
      runPipeline(`Job "${job.title}"`);
      setSelected(job.id);
      setTitle("");
      setText("");
      setBusy(false);
      toast.success(`"${job.title}" processed and scored against the talent pool.`);
    }, 800);
  };

  return (
    <div>
      <PageHeader
        title="Job Descriptions"
        subtitle="Upload or paste a job spec — the Job Agent turns it into structured requirements."
        actions={
          <Button onClick={process} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Process Job Descriptions
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">New role</h2>
            <div className="mt-4 space-y-3">
              <Input placeholder="Role title, e.g. Computer Vision Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                rows={9}
                placeholder="Paste the full job description: responsibilities, required skills, years of experience, education…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-sm text-primary underline underline-offset-4">
                  Upload a .txt spec
                  <input
                    type="file"
                    accept=".txt,.md"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setText(await file.text());
                      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
                      toast.success("Spec loaded — review then process.");
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card shadow-sm">
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
              <h2 className="mr-auto font-display text-base font-semibold">Structured requirements</h2>
              {jobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setSelected(j.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    active?.id === j.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {j.title}
                </button>
              ))}
            </header>
            {active ? (
              <div className="space-y-4 p-5 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                  <span>{active.department}</span>
                  <span>{active.location}</span>
                  <span>{active.employmentType}</span>
                  <span>Minimum {active.minYears} years</span>
                  <span>
                    {active.educationLevel} in {active.educationField}
                  </span>
                  <span>{matches.filter((m) => m.jobId === active.id).length} applicants scored</span>
                </div>
                <p className="text-foreground">{active.description}</p>
                <RequirementList label="Must-have skills" items={active.mustHave} tone="strong" />
                <RequirementList label="Nice-to-have skills" items={active.niceToHave} tone="muted" />
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsibilities</p>
                  <ul className="list-disc space-y-1 pl-5 text-foreground">
                    {active.responsibilities.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                {active.certifications.length ? (
                  <RequirementList label="Preferred certifications" items={active.certifications} tone="muted" />
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-4">
          <PipelineLog stages={pipeline} />
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Briefcase className="h-4 w-4 text-primary" /> Roles
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>{j.title}</span>
                  <span className="text-xs text-muted-foreground">{j.mustHave.length} must-haves</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function RequirementList({ label, items, tone }: { label: string; items: string[]; tone: "strong" | "muted" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              tone === "strong" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
