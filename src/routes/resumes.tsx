import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  extractUploadedFile,
  runResumeAgent,
} from "@/lib/ai.functions";
import { FileText, Loader2, Trash2, UploadCloud, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/bits";
import { PipelineLog } from "@/components/pipeline-log";
import { useStore } from "@/lib/store";
import type { Candidate } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/resumes")({
  head: () => ({
    meta: [
      { title: "Resume Upload — SiftMatch" },
      {
        name: "description",
        content: "Drag and drop PDF or DOCX resumes, watch extraction progress and run the multi-agent screening pipeline.",
      },
      { property: "og:title", content: "Resume Upload — SiftMatch" },
      { property: "og:description", content: "Upload resumes and trigger structured profile extraction." },
    ],
  }),
  component: Resumes,
});

type UploadItem = {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "Uploading" | "Processing" | "Completed";
  progress: number;
};

const SKILL_POOL = ["Python", "SQL", "Machine Learning", "PyTorch", "NLP", "Docker", "Statistics", "LLM"];

function candidateFromFile(name: string, index: number): Candidate {
  const clean = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const display = clean
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const years = 3 + (index % 5);
  const skills = SKILL_POOL.slice(0, 4 + (index % 4));
  return {
    id: `upload-${Date.now()}-${index}`,
    name: display || `Uploaded Candidate ${index + 1}`,
    email: `${clean.toLowerCase().replace(/\s+/g, ".") || "candidate"}@example.com`,
    phone: "+91 90000 00000",
    location: "Not stated",
    age: 27 + (index % 8),
    gender: "Not stated",
    title: "Candidate (parsed from resume)",
    years,
    summary: `Profile extracted from ${name} by the Resume Agent: ${years} years of experience with ${skills.join(", ")}.`,
    skills,
    education: {
      degree: "B.Tech",
      level: "Bachelors",
      field: "Computer Science",
      school: "Extracted from resume",
      year: 2024 - years,
    },
    experience: [
      {
        company: "Most recent employer",
        role: "Engineer",
        start: `${2024 - years}`,
        end: "Present",
        years,
        bullets: [
          `Built and shipped production work using ${skills[0]} and ${skills[1]}.`,
          "Collaborated with product teams to define offline and online metrics.",
        ],
      },
    ],
    projects: [
      {
        name: "Portfolio project",
        description: `Applied ${skills.join(", ")} to an end-to-end pipeline with deployment and inference.`,
        skills,
      },
    ],
    certifications: [],
    source: "upload",
  };
}

function Resumes() {
  const { addCandidate, runPipeline, pipeline, candidates } = useStore();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) => /\.(pdf|docx?|txt)$/i.test(f.name));
    const rejected = files.length - accepted.length;
    if (rejected > 0) toast.error(`${rejected} file(s) skipped — only PDF, DOCX or TXT accepted.`);
    if (accepted.length === 0) return;

    const newItems: UploadItem[] = accepted.map((f, i) => ({
  id: `${Date.now()}-${i}-${f.name}`,
  name: f.name,
  size: f.size,
  file: f,
  status: "Uploading",
  progress: 15,
}));
    setItems((prev) => [...prev, ...newItems]);
    toast.success(`${accepted.length} resume(s) uploading`);

    newItems.forEach((item, i) => {
      window.setTimeout(() => {
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "Processing", progress: 65 } : p)),
        );
      }, 500 + i * 150);
      window.setTimeout(() => {
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "Completed", progress: 100 } : p)),
        );
      }, 1300 + i * 150);
    });
  };

  const process = async () => {
  const ready = items.filter((i) => i.status === "Completed");

  if (ready.length === 0) {
    toast.error("Upload at least one resume before running the pipeline.");
    return;
  }

  setProcessing(true);

  try {
    for (const item of ready) {
      const arrayBuffer = await item.file.arrayBuffer();

      const bytes = new Uint8Array(arrayBuffer);

      let binary = "";

      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i] ?? 0);
      }

      const base64 = btoa(binary);

      const extension = item.name
        .split(".")
        .pop()
        ?.toLowerCase();

      const fileType =
        extension === "pdf"
          ? "pdf"
          : extension === "docx"
            ? "docx"
            : "txt";

     const extracted = await extractUploadedFile({
  data: {
    fileName: item.name,
    fileType,
    base64,
  },
});

console.log("EXTRACTED FILE:", extracted.fileName);
console.log("EXTRACTED TEXT:", extracted.text);

const resume = await runResumeAgent({
  data: {
    fileName: extracted.fileName,
    text: extracted.text,
  },
});

console.log("RESUME AGENT RESULT:", resume);

if (!resume.isResume) {
  toast.error(
    `${item.name} does not appear to be a resume.`
  );
  continue;
}

const candidate: Candidate = {
  id: `ai-${Date.now()}-${item.name}`,
  name: resume.name || "Unknown Candidate",
  email: resume.email,
  phone: resume.phone,
  location: resume.location,
  age: 0,
  gender: "Not stated",
  title: resume.title || "Candidate",
  years: resume.years,
  summary: resume.summary,
  skills: resume.skills,
  education: resume.education,
  experience: resume.experience,
  projects: resume.projects,
  certifications: resume.certifications,
  source: "upload",
};

await addCandidate(candidate);

console.log("RESUME AGENT CREATED CANDIDATE:", candidate);
    }

    toast.success(
      `${ready.length} file(s) successfully read. Check the browser console for extracted text.`,
    );
  } catch (error) {
    console.error("File extraction failed:", error);

    toast.error(
      error instanceof Error
        ? error.message
        : "Unable to read the uploaded file.",
    );
  } finally {
    setProcessing(false);
  }
};

  return (
    <div>
      <PageHeader
        title="Resume Upload"
        subtitle="Drop PDF or DOCX resumes — the Resume Agent extracts a structured profile for each."
        actions={
          <Button onClick={process} disabled={processing}>
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Process Resumes
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files);
            }}
            className={cn(
              "grid place-items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <UploadCloud className="mb-3 h-8 w-8 text-primary" />
            <p className="font-medium">Drag and drop resumes here</p>
            <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX or TXT · up to 20 files at a time</p>
            <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
              Browse files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                accept(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No files in the queue"
              hint="Uploaded resumes appear here with Uploading → Processing → Completed progress before you run the pipeline."
              icon={<FileText className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.max(1, Math.round(item.size / 1024))} KB</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                        item.status === "Completed"
                          ? "bg-strong/12 text-strong"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {item.status === "Completed" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {item.status}
                    </span>
                    <button
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <PipelineLog stages={pipeline} />
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Talent pool</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {candidates.length} profiles available, {candidates.filter((c) => c.source === "upload").length} added
              from uploads this session.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
