# SiftMatch

### AI Resume Screening & Job Matching Platform

SiftMatch is an AI-powered recruitment platform designed to help recruiters screen resumes, match candidates to job descriptions, identify skill gaps, and make explainable, evidence-based hiring decisions.

The platform combines a **multi-agent AI pipeline** with a **deterministic scoring engine** so that AI is used for understanding and reasoning while the final candidate score remains transparent, reproducible, and controlled by application logic.

> **AI-assisted recommendation — final decision remains with the recruiter.**

---

## Overview

Recruiters often need to evaluate large numbers of resumes against multiple job descriptions. Traditional keyword-based screening can miss candidates with relevant experience expressed using different terminology.

SiftMatch addresses this by combining:

- Structured resume extraction
- Structured job requirement extraction
- Semantic skill matching
- Deterministic weighted scoring
- Evidence-based explanations
- Skill gap analysis
- Candidate ranking
- Recruiter feedback
- Personalized interview questions
- Blind screening
- What-if scoring analysis
- Recruitment analytics

The system is designed to support recruiters rather than replace human decision-making.

---

# Key Features

## 1. Two Operating Modes

### Demo Mode

Demo Mode works without an AI API key.

It provides:

- 10 fictional candidate profiles
- 3 predefined job descriptions
- 30 candidate-job combinations
- Precomputed match results
- Strong / Moderate / Weak recommendations
- Matching evidence
- Skill gaps
- Candidate summaries

This allows the complete application to be demonstrated without requiring an external AI service.

### AI Mode

AI Mode uses **Groq's API** with the `openai/gpt-oss-20b` model.

AI calls are performed server-side so that the API key is never exposed to the browser.

AI Mode is used for tasks such as:

- Resume understanding
- Structured candidate extraction
- Job requirement extraction
- Semantic interpretation
- Evidence generation
- Skill gap analysis
- Recruiter-oriented summaries
- Interview question generation

---

# Multi-Agent Architecture

SiftMatch follows a centralized multi-agent architecture.

```text
                         SiftMatch
                             |
                    Central Orchestrator
                             |
              +--------------+--------------+
              |                             |
              v                             v
        Resume Agent                   Job Agent
              |                             |
              +--------------+--------------+
                             |
                             v
                     Matching Agent
                             |
                             v
                     Skill Gap Agent
                             |
                             v
                     Recruiter Agent
                             |
                             v
                        Dashboard