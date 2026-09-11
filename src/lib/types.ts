export type Recommendation = "Strong" | "Moderate" | "Weak";

export type Education = {
  degree: string;
  level: "PhD" | "Masters" | "Bachelors" | "Diploma";
  field: string;
  school: string;
  year: number;
};

export type ExperienceItem = {
  company: string;
  role: string;
  start: string;
  end: string;
  years: number;
  bullets: string[];
};

export type ProjectItem = {
  name: string;
  description: string;
  skills: string[];
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  age: number;
  gender: string;
  title: string;
  years: number;
  summary: string;
  skills: string[];
  education: Education;
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: string[];
  source: "seed" | "upload";
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  minYears: number;
  mustHave: string[];
  niceToHave: string[];
  responsibilities: string[];
  educationLevel: Education["level"];
  educationField: string;
  certifications: string[];
  projectKeywords: string[];
  source: "seed" | "upload";
};

export type Weights = {
  skills: number;
  experience: number;
  projects: number;
  responsibilities: number;
  education: number;
  certifications: number;
};

export type Evidence = { skill: string; quote: string; where: string };

export type Breakdown = {
  key: keyof Weights;
  label: string;
  raw: number; // 0..1
  points: number; // raw * max
  max: number;
};

export type MatchResult = {
  id: string;
  candidateId: string;
  jobId: string;
  score: number;
  recommendation: Recommendation;
  breakdown: Breakdown[];
  matchingSkills: string[];
  evidence: Evidence[];
  missingMustHave: string[];
  missingNiceToHave: string[];
  learningAreas: string[];
  interviewQuestions: string[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
  confidence: number;
  experienceMatchPct: number;
};

export type FeedbackStatus = "Accept" | "Reject" | "Needs Review";

export type Feedback = {
  candidateId: string;
  jobId: string;
  status: FeedbackStatus;
  notes: string;
  at: string;
};
