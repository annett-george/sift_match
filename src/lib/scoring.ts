import type {
  Breakdown,
  Candidate,
  Evidence,
  Job,
  MatchResult,
  Recommendation,
  Weights,
} from "./types";

export const DEFAULT_WEIGHTS: Weights = {
  skills: 40,
  experience: 25,
  projects: 15,
  responsibilities: 10,
  education: 5,
  certifications: 5,
};

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  responsibilities: "Responsibilities",
  education: "Education",
  certifications: "Certifications",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#. ]/g, " ").replace(/\s+/g, " ").trim();

function has(haystack: string, needle: string) {
  return norm(haystack).includes(norm(needle));
}

function skillMatches(candidate: Candidate, skill: string) {
  return candidate.skills.some((s) => norm(s) === norm(skill) || has(s, skill) || has(skill, s));
}

/** Deterministic 0..1 skill coverage: must-have counts double. */
function skillScore(candidate: Candidate, job: Job) {
  let got = 0;
  let total = 0;
  for (const s of job.mustHave) {
    total += 2;
    if (skillMatches(candidate, s)) got += 2;
  }
  for (const s of job.niceToHave) {
    total += 1;
    if (skillMatches(candidate, s)) got += 1;
  }
  return total === 0 ? 0 : got / total;
}

function experienceScore(candidate: Candidate, job: Job) {
  const ratio = job.minYears === 0 ? 1 : candidate.years / job.minYears;
  const base = Math.min(1, ratio);
  const titleWords = norm(job.title).split(" ").filter((w) => w.length > 3);
  const roleText = candidate.experience.map((e) => `${e.role} ${e.company}`).join(" ");
  const relevance = titleWords.length
    ? titleWords.filter((w) => has(roleText, w) || has(candidate.title, w)).length / titleWords.length
    : 0;
  return clamp01(base * 0.75 + relevance * 0.25);
}

function projectScore(candidate: Candidate, job: Job) {
  if (job.projectKeywords.length === 0) return 0;
  const text = candidate.projects
    .map((p) => `${p.name} ${p.description} ${p.skills.join(" ")}`)
    .join(" ");
  const hits = job.projectKeywords.filter((k) => has(text, k)).length;
  return clamp01(hits / job.projectKeywords.length);
}

function responsibilityScore(candidate: Candidate, job: Job) {
  if (job.responsibilities.length === 0) return 0;
  const text = candidate.experience.flatMap((e) => e.bullets).join(" ");
  let hits = 0;
  for (const r of job.responsibilities) {
    const keywords = norm(r).split(" ").filter((w) => w.length > 4);
    const matched = keywords.filter((k) => has(text, k)).length;
    if (keywords.length && matched / keywords.length >= 0.34) hits += 1;
  }
  return clamp01(hits / job.responsibilities.length);
}

const LEVELS = { Diploma: 1, Bachelors: 2, Masters: 3, PhD: 4 } as const;

function educationScore(candidate: Candidate, job: Job) {
  const levelScore = Math.min(1, LEVELS[candidate.education.level] / LEVELS[job.educationLevel]);
  const fieldScore = has(candidate.education.field, job.educationField) ||
    has(job.educationField, candidate.education.field)
    ? 1
    : 0.5;
  return clamp01(levelScore * 0.6 + fieldScore * 0.4);
}

function certificationScore(candidate: Candidate, job: Job) {
  if (job.certifications.length === 0) return candidate.certifications.length ? 1 : 0.5;
  const hits = job.certifications.filter((c) =>
    candidate.certifications.some((cc) => has(cc, c) || has(c, cc)),
  ).length;
  return clamp01(hits / job.certifications.length);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

export function recommendationFor(score: number): Recommendation {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Weak";
}

function findEvidence(candidate: Candidate, skill: string): Evidence | null {
  for (const exp of candidate.experience) {
    const bullet = exp.bullets.find((b) => has(b, skill));
    if (bullet) return { skill, quote: bullet, where: `${exp.role} @ ${exp.company}` };
  }
  for (const p of candidate.projects) {
    if (has(p.description, skill) || p.skills.some((s) => has(s, skill))) {
      return { skill, quote: p.description, where: `Project: ${p.name}` };
    }
  }
  if (has(candidate.summary, skill)) {
    return { skill, quote: candidate.summary, where: "Resume summary" };
  }
  return null;
}

function interviewQuestions(candidate: Candidate, job: Job, missing: string[]) {
  const q: string[] = [];
  const topSkill = job.mustHave.find((s) => skillMatches(candidate, s));
  if (topSkill) {
    q.push(
      `Walk us through the most complex problem you solved using ${topSkill}, and what trade-offs you made.`,
    );
  }
  if (missing[0]) {
    q.push(
      `This role relies heavily on ${missing[0]}, which is not evident in your resume. How would you ramp up in the first 60 days?`,
    );
  }
  if (missing[1]) {
    q.push(`Describe any exposure you have had to ${missing[1]}, even outside of formal work.`);
  }
  const project = candidate.projects[0];
  if (project) {
    q.push(
      `In "${project.name}", how did you measure success and what would you redesign with hindsight?`,
    );
  }
  const resp = job.responsibilities[0];
  if (resp) q.push(`How have you handled ${resp.toLowerCase()} in a production setting?`);
  q.push(
    `Tell us about a time your model or analysis was wrong in production — how did you detect and correct it?`,
  );
  return q.slice(0, 5);
}

export function scoreMatch(candidate: Candidate, job: Job, weights: Weights): MatchResult {
  const raws: Record<keyof Weights, number> = {
    skills: skillScore(candidate, job),
    experience: experienceScore(candidate, job),
    projects: projectScore(candidate, job),
    responsibilities: responsibilityScore(candidate, job),
    education: educationScore(candidate, job),
    certifications: certificationScore(candidate, job),
  };

  const breakdown: Breakdown[] = (Object.keys(raws) as (keyof Weights)[]).map((key) => ({
    key,
    label: WEIGHT_LABELS[key],
    raw: raws[key],
    max: weights[key],
    points: round1(raws[key] * weights[key]),
  }));

  const score = Math.round(breakdown.reduce((sum, b) => sum + b.points, 0));
  const recommendation = recommendationFor(score);

  const jobSkills = [...job.mustHave, ...job.niceToHave];
  const matchingSkills = jobSkills.filter((s) => skillMatches(candidate, s));
  const missingMustHave = job.mustHave.filter((s) => !skillMatches(candidate, s));
  const missingNiceToHave = job.niceToHave.filter((s) => !skillMatches(candidate, s));

  const evidence = matchingSkills
    .map((s) => findEvidence(candidate, s))
    .filter((e): e is Evidence => e !== null)
    .slice(0, 6);

  const strengths: string[] = [];
  if (raws.skills >= 0.7)
    strengths.push(`Covers ${matchingSkills.length}/${jobSkills.length} required skills for the role.`);
  if (candidate.years >= job.minYears)
    strengths.push(`${candidate.years} years of experience against a ${job.minYears}-year bar.`);
  if (raws.projects >= 0.6)
    strengths.push(`Project portfolio maps directly to ${job.projectKeywords.slice(0, 2).join(" and ")}.`);
  if (raws.education >= 0.9)
    strengths.push(`${candidate.education.degree} in ${candidate.education.field} exceeds the education bar.`);
  if (candidate.certifications.length)
    strengths.push(`Holds ${candidate.certifications.length} relevant certification(s).`);

  const weaknesses: string[] = [];
  if (missingMustHave.length)
    weaknesses.push(`Missing must-have skills: ${missingMustHave.join(", ")}.`);
  if (candidate.years < job.minYears)
    weaknesses.push(`${job.minYears - candidate.years} year(s) short of the experience requirement.`);
  if (raws.responsibilities < 0.5)
    weaknesses.push("Limited evidence of the day-to-day responsibilities this role demands.");
  if (raws.certifications < 0.5) weaknesses.push("No certification overlap with the role's preferences.");
  if (weaknesses.length === 0) weaknesses.push("No material gaps detected against the job requirements.");

  const learningAreas = [...missingMustHave, ...missingNiceToHave].slice(0, 4).map((s) => `Hands-on depth in ${s}`);

  const experienceMatchPct = Math.round(clamp01(candidate.years / Math.max(1, job.minYears)) * 100);

  const confidence = Math.round(
    clamp01(
      0.55 +
        raws.skills * 0.2 +
        (evidence.length / 6) * 0.15 +
        (candidate.experience.length >= 2 ? 0.1 : 0),
    ) * 100,
  );

  const summary = `${candidate.name} is a ${recommendation.toLowerCase()} fit for ${job.title} with a deterministic score of ${score}/100. Skills contribute ${breakdown[0]?.points}/${weights.skills} and experience ${breakdown[1]?.points}/${weights.experience}. ${
    missingMustHave.length
      ? `Key gaps remain in ${missingMustHave.slice(0, 2).join(" and ")}.`
      : "All must-have requirements are evidenced in the resume."
  }`;

  return {
    id: `${candidate.id}__${job.id}`,
    candidateId: candidate.id,
    jobId: job.id,
    score,
    recommendation,
    breakdown,
    matchingSkills,
    evidence,
    missingMustHave,
    missingNiceToHave,
    learningAreas,
    interviewQuestions: interviewQuestions(candidate, job, [...missingMustHave, ...missingNiceToHave]),
    strengths: strengths.length ? strengths : ["Baseline profile with transferable fundamentals."],
    weaknesses,
    summary,
    confidence,
    experienceMatchPct,
  };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export const DISCLAIMER = "AI-assisted recommendation — final decision remains with recruiter";
