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

/* ---------------------------------------------------------
   Text normalization
--------------------------------------------------------- */

const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function clamp01(value: number) {
  return Math.max(
    0,
    Math.min(1, Number.isFinite(value) ? value : 0),
  );
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/* ---------------------------------------------------------
   Skill aliases
   Helps the deterministic engine understand common
   equivalent names without depending on an LLM.
--------------------------------------------------------- */

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  react: ["react", "react.js", "reactjs"],
  nodejs: ["node.js", "nodejs", "node"],
  python: ["python", "python3"],
  fastapi: ["fastapi", "fast api"],
  postgresql: ["postgresql", "postgres", "postgres db"],
  sql: ["sql", "structured query language"],
  restapis: ["rest api", "rest apis", "restful api", "restful apis"],
  docker: ["docker", "containerization", "containers"],
  aws: ["aws", "amazon web services"],
  cicd: ["ci/cd", "ci cd", "continuous integration", "continuous deployment"],
  git: ["git", "github", "gitlab"],
  java: ["java"],
  machinelearning: ["machine learning", "ml"],
  deeplearning: ["deep learning", "dl"],
  mongodb: ["mongodb", "mongo db", "mongo"],
};

function canonicalSkill(skill: string) {
  const normalized = norm(skill);

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (
      aliases.some(
        (alias) =>
          normalized === norm(alias) ||
          normalized.includes(norm(alias)),
      )
    ) {
      return canonical;
    }
  }

  return normalized;
}

function skillMatches(candidate: Candidate, requiredSkill: string) {
  const required = canonicalSkill(requiredSkill);

  return candidate.skills.some(
    (candidateSkill) =>
      canonicalSkill(candidateSkill) === required,
  );
}

/* ---------------------------------------------------------
   Skills — 40%
   
   Must-have skills count double.
--------------------------------------------------------- */

function skillScore(candidate: Candidate, job: Job) {
  let earned = 0;
  let possible = 0;

  for (const skill of job.mustHave) {
    possible += 2;

    if (skillMatches(candidate, skill)) {
      earned += 2;
    }
  }

  for (const skill of job.niceToHave) {
    possible += 1;

    if (skillMatches(candidate, skill)) {
      earned += 1;
    }
  }

  return possible === 0
    ? 1
    : clamp01(earned / possible);
}

/* ---------------------------------------------------------
   Experience — 25%
--------------------------------------------------------- */

function experienceScore(
  candidate: Candidate,
  job: Job,
) {
  if (job.minYears <= 0) {
    return 1;
  }

  const experienceRatio =
    candidate.years / job.minYears;

  const quantityScore = clamp01(experienceRatio);

  const titleWords = norm(job.title)
    .split(" ")
    .filter((word) => word.length > 3);

  const candidateRoles = candidate.experience
    .map((experience) =>
      `${experience.role} ${experience.company}`,
    )
    .join(" ");

  const titleRelevance =
    titleWords.length === 0
      ? 0
      : titleWords.filter(
          (word) =>
            norm(candidate.title).includes(word) ||
            norm(candidateRoles).includes(word),
        ).length / titleWords.length;

  return clamp01(
    quantityScore * 0.75 +
      titleRelevance * 0.25,
  );
}

/* ---------------------------------------------------------
   Projects — 15%
--------------------------------------------------------- */

function projectScore(candidate: Candidate, job: Job) {
  if (job.projectKeywords.length === 0) {
    return 1;
  }

  const projectText = candidate.projects
    .map(
      (project) =>
        `${project.name} ${project.description} ${project.skills.join(" ")}`,
    )
    .join(" ");

  const hits = job.projectKeywords.filter(
    (keyword) =>
      norm(projectText).includes(norm(keyword)),
  ).length;

  return clamp01(
    hits / job.projectKeywords.length,
  );
}

/* ---------------------------------------------------------
   Responsibilities — 10%
--------------------------------------------------------- */

function responsibilityScore(
  candidate: Candidate,
  job: Job,
) {
  if (job.responsibilities.length === 0) {
    return 1;
  }

  const experienceText = candidate.experience
    .flatMap((experience) => experience.bullets)
    .join(" ");

  let matchedResponsibilities = 0;

  for (const responsibility of job.responsibilities) {
    const keywords = norm(responsibility)
      .split(" ")
      .filter((word) => word.length > 4);

    if (keywords.length === 0) {
      continue;
    }

    const matchedKeywords = keywords.filter(
      (keyword) =>
        norm(experienceText).includes(keyword),
    ).length;

    if (
      matchedKeywords / keywords.length >=
      0.34
    ) {
      matchedResponsibilities++;
    }
  }

  return clamp01(
    matchedResponsibilities /
      job.responsibilities.length,
  );
}

/* ---------------------------------------------------------
   Education — 5%
--------------------------------------------------------- */

const EDUCATION_LEVELS = {
  Diploma: 1,
  Bachelors: 2,
  Masters: 3,
  PhD: 4,
} as const;

function educationScore(
  candidate: Candidate,
  job: Job,
) {
  const candidateLevel =
  EDUCATION_LEVELS[candidate.education.level];

const requiredLevel =
  EDUCATION_LEVELS[job.educationLevel];

  const levelScore = clamp01(
    candidateLevel / requiredLevel,
  );

  const candidateField = norm(
    candidate.education.field,
  );

  const requiredField = norm(
    job.educationField,
  );

  const fieldScore =
    !requiredField ||
    requiredField === "not stated"
      ? 1
      : candidateField.includes(requiredField) ||
          requiredField.includes(candidateField)
        ? 1
        : 0.5;

  return clamp01(
    levelScore * 0.6 +
      fieldScore * 0.4,
  );
}

/* ---------------------------------------------------------
   Certifications — 5%
--------------------------------------------------------- */

function certificationScore(
  candidate: Candidate,
  job: Job,
) {
  if (job.certifications.length === 0) {
    return 1;
  }

  if (candidate.certifications.length === 0) {
    return 0;
  }

  const matched = job.certifications.filter(
    (requiredCertification) =>
      candidate.certifications.some(
        (candidateCertification) =>
          norm(candidateCertification).includes(
            norm(requiredCertification),
          ) ||
          norm(requiredCertification).includes(
            norm(candidateCertification),
          ),
      ),
  ).length;

  return clamp01(
    matched / job.certifications.length,
  );
}

/* ---------------------------------------------------------
   Recommendation
--------------------------------------------------------- */

export function recommendationFor(
  score: number,
): Recommendation {
  if (score >= 80) {
    return "Strong";
  }

  if (score >= 60) {
    return "Moderate";
  }

  return "Weak";
}

/* ---------------------------------------------------------
   Evidence
--------------------------------------------------------- */

function findEvidence(
  candidate: Candidate,
  skill: string,
): Evidence | null {
  for (const experience of candidate.experience) {
    const bullet = experience.bullets.find(
      (item) =>
        norm(item).includes(norm(skill)),
    );

    if (bullet) {
      return {
        skill,
        quote: bullet,
        where: `${experience.role} @ ${experience.company}`,
      };
    }
  }

  for (const project of candidate.projects) {
    const matchesDescription =
      norm(project.description).includes(
        norm(skill),
      );

    const matchesProjectSkill =
      project.skills.some((item) =>
        norm(item).includes(norm(skill)),
      );

    if (
      matchesDescription ||
      matchesProjectSkill
    ) {
      return {
        skill,
        quote: project.description,
        where: `Project: ${project.name}`,
      };
    }
  }

  if (
    norm(candidate.summary).includes(
      norm(skill),
    )
  ) {
    return {
      skill,
      quote: candidate.summary,
      where: "Resume summary",
    };
  }

  return null;
}

/* ---------------------------------------------------------
   Interview questions
--------------------------------------------------------- */

function interviewQuestions(
  candidate: Candidate,
  job: Job,
  missing: string[],
) {
  const questions: string[] = [];

  const strongestSkill = job.mustHave.find(
    (skill) =>
      skillMatches(candidate, skill),
  );

  if (strongestSkill) {
    questions.push(
      `Walk us through the most complex problem you solved using ${strongestSkill}, and what trade-offs you made.`,
    );
  }

  if (missing[0]) {
    questions.push(
      `This role relies heavily on ${missing[0]}, which is not evident in your resume. How would you ramp up in the first 60 days?`,
    );
  }

  if (missing[1]) {
    questions.push(
      `Describe any exposure you have had to ${missing[1]}, even outside of formal work.`,
    );
  }

  const project = candidate.projects[0];

  if (project) {
    questions.push(
      `In "${project.name}", how did you measure success and what would you redesign with hindsight?`,
    );
  }

  const responsibility =
    job.responsibilities[0];

  if (responsibility) {
    questions.push(
      `How have you handled ${responsibility.toLowerCase()} in a production setting?`,
    );
  }

  return questions.slice(0, 5);
}

/* ---------------------------------------------------------
   MAIN MATCHING ENGINE
--------------------------------------------------------- */

export function scoreMatch(
  candidate: Candidate,
  job: Job,
  weights: Weights,
): MatchResult {
  const raws: Record<
    keyof Weights,
    number
  > = {
    skills: skillScore(candidate, job),
    experience: experienceScore(
      candidate,
      job,
    ),
    projects: projectScore(candidate, job),
    responsibilities:
      responsibilityScore(candidate, job),
    education: educationScore(
      candidate,
      job,
    ),
    certifications:
      certificationScore(candidate, job),
  };

  /*
   * Convert every category into weighted points.
   * Because the default weights total 100,
   * the final score is naturally out of 100.
   */
  const breakdown: Breakdown[] = (
    Object.keys(raws) as (keyof Weights)[]
  ).map((key) => ({
    key,
    label: WEIGHT_LABELS[key],
    raw: round1(raws[key] * 100),
    max: weights[key],
    points: round1(
      raws[key] * weights[key],
    ),
  }));

  const score = Math.round(
    breakdown.reduce(
      (total, item) =>
        total + item.points,
      0,
    ),
  );

  const recommendation =
    recommendationFor(score);

  /* -------------------------------------------------------
     Skill analysis
  ------------------------------------------------------- */

  const allJobSkills = [
    ...job.mustHave,
    ...job.niceToHave,
  ];

  const matchingSkills =
    allJobSkills.filter((skill) =>
      skillMatches(candidate, skill),
    );

  const missingMustHave =
    job.mustHave.filter(
      (skill) =>
        !skillMatches(candidate, skill),
    );

  const missingNiceToHave =
    job.niceToHave.filter(
      (skill) =>
        !skillMatches(candidate, skill),
    );

  /* -------------------------------------------------------
     Evidence
  ------------------------------------------------------- */

  const evidence = matchingSkills
    .map((skill) =>
      findEvidence(candidate, skill),
    )
    .filter(
      (item): item is Evidence =>
        item !== null,
    )
    .slice(0, 6);

  /* -------------------------------------------------------
     Strengths
  ------------------------------------------------------- */

  const strengths: string[] = [];

  if (raws.skills >= 0.7) {
    strengths.push(
      `Covers ${matchingSkills.length}/${allJobSkills.length} listed job skills.`,
    );
  }

  if (
    candidate.years >= job.minYears
  ) {
    strengths.push(
      `${candidate.years} years of experience meets the ${job.minYears}-year requirement.`,
    );
  }

  if (raws.projects >= 0.6) {
    strengths.push(
      `Project experience aligns with the role's project requirements.`,
    );
  }

  if (raws.education >= 0.9) {
    strengths.push(
      `${candidate.education.degree} in ${candidate.education.field} meets or exceeds the education requirement.`,
    );
  }

  if (evidence.length > 0) {
    strengths.push(
      `${evidence.length} resume evidence item(s) support the match.`,
    );
  }

  /* -------------------------------------------------------
     Weaknesses
  ------------------------------------------------------- */

  const weaknesses: string[] = [];

  if (missingMustHave.length > 0) {
    weaknesses.push(
      `Missing must-have skills: ${missingMustHave.join(", ")}.`,
    );
  }

  if (
    candidate.years < job.minYears
  ) {
    weaknesses.push(
      `${Math.max(
        0,
        job.minYears - candidate.years,
      )} year(s) short of the experience requirement.`,
    );
  }

  if (raws.responsibilities < 0.5) {
    weaknesses.push(
      "Limited evidence of the day-to-day responsibilities this role demands.",
    );
  }

  if (raws.education < 0.6) {
    weaknesses.push(
      "Education has limited alignment with the stated requirement.",
    );
  }

  if (
    weaknesses.length === 0
  ) {
    weaknesses.push(
      "No material gaps detected against the stated job requirements.",
    );
  }

  /* -------------------------------------------------------
     Learning areas
  ------------------------------------------------------- */

  const learningAreas = [
    ...missingMustHave,
    ...missingNiceToHave,
  ]
    .slice(0, 4)
    .map(
      (skill) =>
        `Hands-on depth in ${skill}`,
    );

  /* -------------------------------------------------------
     Experience percentage
  ------------------------------------------------------- */

  const experienceMatchPct =
    job.minYears <= 0
      ? 100
      : Math.round(
          clamp01(
            candidate.years /
              job.minYears,
          ) * 100,
        );

  /* -------------------------------------------------------
     Confidence
  ------------------------------------------------------- */

  const evidenceConfidence =
    Math.min(
      evidence.length / 6,
      1,
    );

  const confidence = Math.round(
    clamp01(
      0.5 +
        raws.skills * 0.2 +
        evidenceConfidence * 0.15 +
        (candidate.experience.length >=
        2
          ? 0.1
          : 0),
    ) * 100,
  );

  /* -------------------------------------------------------
     Human-readable summary
  ------------------------------------------------------- */

  const summary =
    `${candidate.name} is a ${recommendation.toLowerCase()} fit for ${job.title} with a deterministic score of ${score}/100. ` +
    `Skills contribute ${breakdown.find((item) => item.key === "skills")?.points ?? 0}/${weights.skills} points and experience contributes ${breakdown.find((item) => item.key === "experience")?.points ?? 0}/${weights.experience} points. ` +
    (
      missingMustHave.length > 0
        ? `Key gaps remain in ${missingMustHave.slice(0, 2).join(" and ")}.`
        : "All must-have requirements are evidenced in the resume."
    );

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
    interviewQuestions:
      interviewQuestions(
        candidate,
        job,
        [
          ...missingMustHave,
          ...missingNiceToHave,
        ],
      ),
    strengths:
      strengths.length > 0
        ? strengths
        : [
            "Baseline profile with transferable fundamentals.",
          ],
    weaknesses,
    summary,
    confidence,
    experienceMatchPct,
  };
}

export const DISCLAIMER =
  "AI-assisted recommendation — final decision remains with recruiter";