import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SEED_CANDIDATES, SEED_JOBS } from "./seed";
import { supabase } from "./supabase";
import { DEFAULT_WEIGHTS, scoreMatch } from "./scoring";
import type {
  Candidate,
  Feedback,
  FeedbackStatus,
  Job,
  MatchResult,
  Weights,
} from "./types";

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
  feedbackFor: (
    candidateId: string,
    jobId: string,
  ) => Feedback | undefined;
  addCandidate: (c: Candidate) => void;
  addJob: (j: Job) => void;
  pipeline: PipelineStage[];
  runPipeline: (label: string) => PipelineStage[];
  aiMode: boolean;
  setAiMode: (v: boolean) => void;
};

const StoreContext =
  createContext<StoreValue | null>(null);

const AGENTS: Array<[string, string]> = [
  [
    "Resume Agent",
    "Extracted structured profiles: contact, skills, experience, projects, education, certifications.",
  ],
  [
    "Job Agent",
    "Extracted structured requirements: must-have vs nice-to-have skills, responsibilities, education bar.",
  ],
  [
    "Matching Agent",
    "Performed deterministic weighted matching and pulled resume evidence for matched skills.",
  ],
  [
    "Skill Gap Agent",
    "Computed must-have / nice-to-have gaps, learning areas and tailored interview questions.",
  ],
  [
    "Recruiter Agent",
    "Assembled strengths, weaknesses, summary and confidence score for recruiter review.",
  ],
];

/* ---------------------------------------------------------
   Supabase → application type conversion
--------------------------------------------------------- */

function toCandidate(row: any): Candidate {
  const education = row.education ?? {};

  return {
    id: String(row.id),
    name: row.name ?? "Unknown Candidate",
    email: row.email ?? "",
    phone: row.phone ?? "",
    location: row.location ?? "",
    age: Number(row.age ?? 0),
    gender: row.gender ?? "Not stated",
    title: row.title ?? "Candidate",
    years: Number(row.experience_years ?? 0),
    summary: row.resume_text ?? "",
    skills: Array.isArray(row.skills)
      ? row.skills
      : [],
    education: {
      degree: education.degree ?? "",
      level: education.level ?? "Bachelors",
      field: education.field ?? "",
      school: education.school ?? "",
      year: Number(education.year ?? 0),
    },
    experience: Array.isArray(row.experience)
      ? row.experience
      : [],
    projects: Array.isArray(row.projects)
      ? row.projects
      : [],
    certifications: Array.isArray(
      row.certifications,
    )
      ? row.certifications
      : [],
    source: "upload",
  };
}

function toJob(row: any): Job {
  const education =
    row.education_requirements ?? {};

  return {
    id: String(row.id),
    title: row.title ?? "Untitled Role",
    department: row.company ?? "Not stated",
    location: row.location ?? "Not stated",
    employmentType: "Full-time",
    description: row.description ?? "",
    minYears: Number(
      row.minimum_experience ?? 0,
    ),
    mustHave: Array.isArray(
      row.required_skills,
    )
      ? row.required_skills
      : [],
    niceToHave: Array.isArray(
      row.preferred_skills,
    )
      ? row.preferred_skills
      : [],
    responsibilities: Array.isArray(
      row.responsibilities,
    )
      ? row.responsibilities
      : [],
    educationLevel:
      education.level ?? "Bachelors",
    educationField:
      education.field ??
      education.educationField ??
      "Not stated",
    certifications: Array.isArray(
      row.certifications,
    )
      ? row.certifications
      : [],
    projectKeywords: Array.isArray(
      education.projectKeywords,
    )
      ? education.projectKeywords
      : [],
    source: "upload",
  };
}

/* ---------------------------------------------------------
   Provider
--------------------------------------------------------- */

export function StoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [candidates, setCandidates] =
    useState<Candidate[]>(SEED_CANDIDATES);

  const [jobs, setJobs] =
    useState<Job[]>(SEED_JOBS);

  const [weights, setWeightsState] =
    useState<Weights>(DEFAULT_WEIGHTS);

  const [blindMode, setBlindMode] =
    useState(false);

  const [feedback, setFeedback] =
    useState<Feedback[]>([]);

  const [pipeline, setPipeline] =
    useState<PipelineStage[]>([]);

  const [aiMode, setAiMode] =
    useState(false);

  /* -------------------------------------------------------
     Load real data from Supabase
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadSupabaseData() {
      console.log(
        "Loading SiftMatch data from Supabase...",
      );

      const [
        candidatesResult,
        jobsResult,
      ] = await Promise.all([
        supabase
          .from("candidates")
          .select("*"),

        supabase
          .from("jobs")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (cancelled) {
        return;
      }

      if (candidatesResult.error) {
        console.error(
          "Failed to load candidates:",
          candidatesResult.error,
        );
      } else if (
        candidatesResult.data &&
        candidatesResult.data.length > 0
      ) {
        const loadedCandidates =
          candidatesResult.data.map(toCandidate);

        setCandidates(loadedCandidates);

        console.log(
          `Loaded ${loadedCandidates.length} candidate(s) from Supabase.`,
        );
      } else {
        console.log(
          "No candidates found in Supabase. Using seed candidates.",
        );
      }

      if (jobsResult.error) {
        console.error(
          "Failed to load jobs:",
          jobsResult.error,
        );
      } else if (
        jobsResult.data &&
        jobsResult.data.length > 0
      ) {
        const loadedJobs =
          jobsResult.data.map(toJob);

        setJobs(loadedJobs);

        console.log(
          `Loaded ${loadedJobs.length} job(s) from Supabase.`,
        );
      } else {
        console.log(
          "No jobs found in Supabase. Using seed jobs.",
        );
      }
    }

    void loadSupabaseData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------
     Deterministic Matching Agent
  ------------------------------------------------------- */

  const matchesWith = useCallback(
    (w: Weights) => {
      const output: MatchResult[] = [];

      for (const job of jobs) {
        for (const candidate of candidates) {
          output.push(
            scoreMatch(
              candidate,
              job,
              w,
            ),
          );
        }
      }

      return output.sort(
        (a, b) => b.score - a.score,
      );
    },
    [candidates, jobs],
  );

  const matches = useMemo(
    () => matchesWith(weights),
    [matchesWith, weights],
  );

  /* -------------------------------------------------------
     Store actions
  ------------------------------------------------------- */

  const value: StoreValue = {
    candidates,

    jobs,

    weights,

    setWeights: setWeightsState,

    resetWeights: () =>
      setWeightsState(DEFAULT_WEIGHTS),

    blindMode,

    setBlindMode,

    matches,

    matchesWith,

    feedback,

    saveFeedback: (f) =>
      setFeedback((previous) => [
        {
          ...f,
          at: new Date().toISOString(),
        },
        ...previous.filter(
          (item) =>
            !(
              item.candidateId ===
                f.candidateId &&
              item.jobId === f.jobId
            ),
        ),
      ]),

    feedbackFor: (
      candidateId,
      jobId,
    ) =>
      feedback.find(
        (item) =>
          item.candidateId ===
            candidateId &&
          item.jobId === jobId,
      ),

    /* -----------------------------------------------------
       Add Candidate
    ----------------------------------------------------- */

    addCandidate: async (
      candidate,
    ) => {
      setCandidates((previous) => [
        ...previous,
        candidate,
      ]);

      const { error } =
        await supabase
          .from("candidates")
          .insert({
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            location: candidate.location,
            education:
              candidate.education,
            experience_years:
              candidate.years,
            skills: candidate.skills,
            certifications:
              candidate.certifications,
            projects:
              candidate.projects,
            resume_text:
              candidate.summary,
          });

      if (error) {
        console.error(
          "Failed to save candidate:",
          error,
        );
      } else {
        console.log(
          "Candidate saved to Supabase:",
          candidate.name,
        );
      }
    },

    /* -----------------------------------------------------
       Add Job
    ----------------------------------------------------- */

    addJob: async (job) => {
      /*
       * Immediately show the job in the UI.
       */
      setJobs((previous) => [
        ...previous,
        job,
      ]);

      /*
       * Store the structured Job Agent result
       * in the Supabase jobs table.
       */
      const { data, error } =
        await supabase
          .from("jobs")
          .insert({
            title: job.title,
            company:
              job.department,
            location:
              job.location,
            description:
              job.description,
            required_skills:
              job.mustHave,
            preferred_skills:
              job.niceToHave,
            minimum_experience:
              job.minYears,
            education_requirements: {
              level:
                job.educationLevel,
              field:
                job.educationField,
              projectKeywords:
                job.projectKeywords,
            },
            responsibilities:
              job.responsibilities,
            certifications:
              job.certifications,
          })
          .select()
          .single();

      if (error) {
        console.error(
          "Failed to save job:",
          error,
        );
        return;
      }

      /*
       * Replace the temporary local ID with
       * the real Supabase UUID.
       */
      if (data?.id) {
        setJobs((previous) =>
          previous.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  id: String(
                    data.id,
                  ),
                }
              : item,
          ),
        );
      }

      console.log(
        "Job saved to Supabase:",
        job.title,
      );
    },

    /* -----------------------------------------------------
       Pipeline
    ----------------------------------------------------- */

    pipeline,

    runPipeline: (label) => {
      const now = new Date();

      const stages =
        AGENTS.map(
          ([agent, detail], index) => ({
            agent,
            detail: `${label}: ${detail}`,
            at: new Date(
              now.getTime() +
                index * 400,
            ).toLocaleTimeString(),
          }),
        );

      setPipeline(stages);

      return stages;
    },

    aiMode,

    setAiMode,
  };

  return (
    <StoreContext.Provider
      value={value}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context =
    useContext(StoreContext);

  if (!context) {
    throw new Error(
      "useStore must be used inside StoreProvider",
    );
  }

  return context;
}

/* ---------------------------------------------------------
   Blind screening helpers
--------------------------------------------------------- */

export function maskName(
  name: string,
  blind: boolean,
  id: string,
) {
  if (!blind) {
    return name;
  }

  const number =
    id.replace(/\D/g, "") ||
    "0";

  return `Candidate #${number.padStart(
    3,
    "0",
  )}`;
}

export function maskInitials(
  name: string,
  blind: boolean,
) {
  if (blind) {
    return "••";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function maskText(
  value: string,
  blind: boolean,
) {
  return blind
    ? "•••••••"
    : value;
}