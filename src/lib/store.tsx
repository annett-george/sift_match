import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { SEED_CANDIDATES, SEED_JOBS } from "./seed";
import { DEFAULT_WEIGHTS, scoreMatch } from "./scoring";
import type { Candidate, Feedback, FeedbackStatus, Job, MatchResult, Weights } from "./types";

export type PipelineStage = {
  agent: string;
  detail: string;
  at: string;
};

type StoreValue = {
  candidates: Candidate[];
  jobs: Job[];
  weights: Weights;
  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  blindMode: boolean;
  setBlindMode: (v: boolean) => void;
  matches: MatchResult[];
  matchesWith: (w: Weights) => MatchResult[];
  feedback: Feedback[];
  saveFeedback: (f: Omit<Feedback, "at">) => void;
  feedbackFor: (candidateId: string, jobId: string) => Feedback | undefined;
  addCandidate: (c: Candidate) => void;
  addJob: (j: Job) => void;
  pipeline: PipelineStage[];
  runPipeline: (label: string) => PipelineStage[];
  aiMode: boolean;
  setAiMode: (v: boolean) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const AGENTS: Array<[string, string]> = [
  ["Resume Agent", "Extracted structured profiles: contact, skills, experience, projects, education, certifications."],
  ["Job Agent", "Extracted structured requirements: must-have vs nice-to-have skills, responsibilities, education bar."],
  ["Matching Agent", "Performed semantic matching and pulled verbatim evidence quotes for every matched skill."],
  ["Skill Gap Agent", "Computed must-have / nice-to-have gaps, learning areas and tailored interview questions."],
  ["Recruiter Agent", "Assembled strengths, weaknesses, summary and confidence score for recruiter review."],
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>(SEED_CANDIDATES);
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [weights, setWeightsState] = useState<Weights>(DEFAULT_WEIGHTS);
  const [blindMode, setBlindMode] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [aiMode, setAiMode] = useState(false);

  const matchesWith = useCallback(
    (w: Weights) => {
      const out: MatchResult[] = [];
      for (const job of jobs) for (const cand of candidates) out.push(scoreMatch(cand, job, w));
      return out.sort((a, b) => b.score - a.score);
    },
    [candidates, jobs],
  );

  const matches = useMemo(() => matchesWith(weights), [matchesWith, weights]);

  const value: StoreValue = {
    candidates,
    jobs,
    weights,
    setWeights: setWeightsState,
    resetWeights: () => setWeightsState(DEFAULT_WEIGHTS),
    blindMode,
    setBlindMode,
    matches,
    matchesWith,
    feedback,
    saveFeedback: (f) =>
      setFeedback((prev) => [
        { ...f, at: new Date().toISOString() },
        ...prev.filter((p) => !(p.candidateId === f.candidateId && p.jobId === f.jobId)),
      ]),
    feedbackFor: (candidateId, jobId) =>
      feedback.find((f) => f.candidateId === candidateId && f.jobId === jobId),
    addCandidate: (c) => setCandidates((prev) => [...prev, c]),
    addJob: (j) => setJobs((prev) => [...prev, j]),
    pipeline,
    runPipeline: (label) => {
      const now = new Date();
      const stages = AGENTS.map(([agent, detail], i) => ({
        agent,
        detail: `${label}: ${detail}`,
        at: new Date(now.getTime() + i * 400).toLocaleTimeString(),
      }));
      setPipeline(stages);
      return stages;
    },
    aiMode,
    setAiMode,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Blind screening helpers — obfuscate identity across the whole UI. */
export function maskName(name: string, blind: boolean, id: string) {
  if (!blind) return name;
  const n = id.replace(/\D/g, "") || "0";
  return `Candidate #${n.padStart(3, "0")}`;
}

export function maskInitials(name: string, blind: boolean) {
  if (blind) return "••";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function maskText(value: string, blind: boolean) {
  return blind ? "•••••••" : value;
}
