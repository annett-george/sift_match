# SiftMatch Pro

Build SiftMatch — an AI-powered resume screening and job-matching platform for recruiters (Subtitle: 'AI Resume Screening').

Core Requirements:
1. Two Modes & Resilient Architecture:
- Demo Mode (default): Seeded with 10 rich fictional candidates and 3 detailed jobs ('Machine Learning Engineer', 'Data Scientist', 'AI/NLP Engineer') yielding 30 candidate-job matches with realistic Strong/Moderate/Weak distribution and evidence quotes. No API key needed, zero crashes.
- AI Mode: Edge function integration for server-side LLM calls using gpt-6-astra when OPENAI_API_KEY is configured. Never expose keys to client.
- Status badge in top bar: 'Demo Mode' / 'AI Mode'.

2. Deterministic Scoring Model:
- Final score strictly calculated deterministically in application code (never hallucinated by LLM):
  Skills (40%), Experience (25%), Projects (15%), Responsibilities (10%), Education (5%), Certifications (5%) = 100%.
- Display score breakdown (XX/40, XX/25, etc.) and category recommendations: Strong (>=80), Moderate (60-79), Weak (<60).

3. Multi-Agent Pipeline & Orchestration:
- Central orchestrator sequence: Resume Agent (structured profile extraction) -> Job Agent (structured requirements extraction) -> Matching Agent (semantic matching & evidence generation) -> Skill Gap Agent (must-have vs nice-to-have gaps, learning areas, interview questions) -> Recruiter Agent (strengths, weaknesses, AI summary, confidence score, disclaimer: 'AI-assisted recommendation — final decision remains with recruiter').
- All agent outputs visible and inspectable.

4. Navigation & Pages:
- Sidebar: Dashboard, Resume Upload, Job Descriptions, Candidate Rankings, Comparison, Analytics, Settings.
- Dashboard: Key metrics (total resumes, jobs, matches, strong/moderate/weak breakdown, average match score), Top Ranked Candidates table, Open roles with applicant tallies.
- Resume Upload: Drag-and-drop & browse for PDF/DOCX, progress states (Uploading -> Processing -> Completed), 'Process Resumes' pipeline trigger with text extraction and profile generation.
- Job Description Upload: Upload/paste job specs, 'Process Job Descriptions' pipeline trigger, structured requirement viewer.
- Candidate Rankings: Filter by job, score range, recommendation badge, skills; sortable table with one-click drill-down to candidate detail.
- Candidate Detail: Full candidate profile, target role, deterministic score breakdown cards/bars, matching skills with quoted evidence, skill gaps, projects/experience/certs, personalized interview questions, recruiter feedback form (Accept / Reject / Needs Review + notes).
- Comparison Page: Multi-candidate side-by-side matrix comparison for any selected role across scores, strengths, gaps, education, and recommendations.
- Analytics Page: Distribution charts (recharts) for scores, common skills, top skill gaps, recommendation splits, average experience match %.
- Settings Page: Active mode badge, model info (GPT-6 Astra), editable scoring weights, Blind Screening toggle, system status indicators.

5. Key Interactive Features:
- Blind Screening Toggle: When active, obfuscates candidate names, avatars, age, gender, and contact details across the entire UI.
- What-If Scenario Analysis: Interactive sliders for the 6 scoring weights (must sum to 100%) recalculating live rankings dynamically in-memory without mutating baseline records.
- Natural Language Recruiter Search: Search input (e.g., 'Find candidates with Python, PyTorch and 3+ years experience') with parsed criteria and matched candidates list.
- Recruiter Feedback logging: Accept/Reject/Review status with notes logged per candidate.

6. Design:
- Modern, clean recruiter dashboard aesthetic with Tailwind CSS, Lucide icons, accessible responsive layouts, toast alerts, and robust empty/loading states. All buttons and flows must be fully functional.



## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
