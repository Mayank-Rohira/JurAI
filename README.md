# JurAI
### Automated Compliance Intelligence & Stateful Consensus Loops for High-Growth Product Teams

[![TRL-4 Prototype](https://img.shields.io/badge/TRL--4-Prototype-orange)](#)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/Inference-Groq-red?style=flat-square&logo=groq)](https://groq.com/)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-blue?style=flat-square)](https://www.trychroma.com/)
[![Zero Budget](https://img.shields.io/badge/Infrastructure-Zero%20Cost-00897B)](#)
[![Agents](https://img.shields.io/badge/Architecture-Multi--Agent%20System-1565C0)](#)

---

> A TRL-4 regulatory intelligence prototype.  
> Zero paid infrastructure. Full-stack multi-agent compliance validation pipeline.

---

## ◈ The Core Thesis: An Agentic Consensus & RAG Layer That Makes LLM Compliance Deterministic

Standard legal language models excel at summarization but collapse when forced to make precise, context-aware compliance decisions. They output vague summaries instead of audit-ready legal evaluations.

**JurAI does not just summarize regulations. It models them deterministically.**

The **Stateful Consensus & RAG Engine** is an orchestration framework that sits directly between product requirements and your legal timeline. It intercepts technical product definitions, retrieves live global statutes from an embedded vector database, and subjects them to an adversarial multi-agent consensus loop.

The architectural advantages are significant:

- **Bridges the Technical-Legal Gap**: Translates complex engineering architectures into verified compliance violations and vice-versa, outputting explicit step-by-step engineering tickets.
- **Law 0 Internal Enforcement**: Enforces internal corporate constraints ("Law 0" policies, such as specific regional data limitations or vendor restrictions) at the earliest planning phase.
- **Stateful Revision Diffing**: Automatically tracks compliance diffs between design iterations, identifying if a compliance posture shifted due to a code update or a change in global statutes.
- **Litigation-Ready Audit Timeline**: Generates a timestamped, chronological log detailing every compliance decision, actor, and exact moment of deviation from the approved compliance plan.

---

## ◈ The Problem: The Gap Between Code and Statute

Software developers build features in weeks, while legal compliance teams operate in audit quarters. This speed mismatch results in two systemic failures:

1. **The Snap-Shot Blindspot**: Standard compliance reviews occur at a single point in time, usually right before release. There is no record of why a feature diverged from its original compliance plan during development.
2. **Hallucination Risks**: General-purpose AI chatbots lack grounding. They evaluate GDPR or DPDP requirements based on fuzzy parameters, failing to cite specific articles or corporate policies. This makes their output useless for actual litigation defense.

Without a structured, version-controlled compliance history, companies lack a cohesive, chronological trace of their regulatory due diligence when audits arise.

---

## ◈ The Consensus-First Jury Loop

JurAI ensures rigorous compliance evaluations by passing requirements through an autonomous agentic consensus loop:

```
◉ User Proposes Feature
     │
     ├─▶ RAG Statute Retrieval (ChromaDB + all-MiniLM-L6-v2)
     │
     ├─▶ [Jury Agent (Llama 3.3 70B)]
     │       Drafts initial compliance report citing specific global articles
     │
     ├─▶ [Critic Agent (Llama 3.3 70B)]
     │       Adversarially audits the draft; highlights gaps, contradictions, or missed risks
     │       If issues found: returns to Jury for refinement (Max 2 iterations)
     │
     ├─▶ [Judge Agent (Llama 3.3 70B)]
     │       Synthesizes refined findings into structured JSON containing exact violation lists
     │
     └─▶ [Risk Engine] -> [Autofix Engine] -> Commits Immutable Verdict Version
```

### ▸ Deterministic Risk Scoring Formula

The Risk Engine maps the unstructured outputs of the Judge agent to a normalized numeric score (0-100) and categorical risk levels:

```
Risk Score Calculation:

  base_score = 0.0

  for each violation in judge_verdict.violations:
      if severity == "CRITICAL" : weight = 30.0
      if severity == "HIGH"     : weight = 15.0
      if severity == "MODERATE" : weight = 8.0
      if severity == "LOW"      : weight = 3.0
      
      base_score += weight * (1.0 + 0.2 * violation.frequency)

  # Factor in corporate internal "Law 0" policies
  base_score += 15.0 * context.law_0_violations

  final_risk_score = min(base_score, 100.0)
```

**Worked Example — Direct Marketing Feature targeting EU Minors:**

| Parameter | Value |
|---|---|
| GDPR Article 8 (Children's Consent) | CRITICAL violation (Weight: 30) |
| India DPDP Sec 9 (Children's Data) | CRITICAL violation (Weight: 30) |
| Law 0 Policy (Vendor ban on untrusted hosts) | 1 violation (Weight: 15) |
| Raw Accumulated Score | 30 + 30 + 15 = 75 |
| **GCL Adjusted Risk Score** | **75.0 (High Risk)** |

An ungrounded LLM may label this "potentially problematic." JurAI outputs a deterministic **75.0 High Risk** classification, locking the lifecycle state and triggering the Auto-Fix Engine to generate specific engineering requirements.

---

## ◈ Multi-Agent Architecture

The platform operates as a zero-shot multi-agent system running asynchronous execution routines. Real-time reasoning steps are streamed directly to the frontend client using Server-Sent Events (SSE).

### ▸ System Flow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POST /stream/pipeline  →  FastAPI Backend (SSE Stream)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │
    ├──▶ [ RAG Statute Retrieval ]
    │        ↳ Local ChromaDB query using HuggingFace all-MiniLM-L6-v2 embeddings
    │        → Cites GDPR, India DPDP, IT Act, and corporate Law 0 policies
    │
    ├──▶ [ Agent-Critic Loop ] (LiteLLM universal adapter on Groq)
    │        ↳ Jury Agent drafts initial evaluation
    │        ↳ Critic Agent analyzes draft; checks against law citations
    │        ↳ Iterative correction (Up to 2 cycles)
    │        → Refined consensus report
    │
    ├──▶ [ Judge Agent ]
    │        ↳ Translates narrative text to structured compliance JSON
    │        → Structured Verdict
    │
    ├──▶ [ Risk Pipeline ]
    │        ↳ Performs deterministic scoring calculations
    │        → Numeric Risk Score & Risk Drivers
    │
    ├──▶ [ Autofix Pipeline ]
    │        ↳ Map compliance violations to engineering implementation steps
    │        → Actionable Remediation Tickets
    │
    └──▶ [ History Manager ]
             ↳ Writes versioned, immutable JSON snapshot to file storage
             ↳ Executes compliance diffing against previous version
             → Active Deviation Timeline
```

---

## ◈ Technical Stack

| Layer | Tool | Configuration / Host |
|---|---|---|
| **Frontend** | Next.js 14 + Framer Motion | High-trust professional dark terminal aesthetic |
| **Backend** | FastAPI + Python 3.11 | Handles real-time SSE streaming and RAG retrieval |
| **Orchestration**| LiteLLM | Swappable provider abstraction layer |
| **Vector DB** | ChromaDB | Persisted local vector database for legal knowledge |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` | Runs locally via SentenceTransformers |
| **Primary Agents**| Groq (`llama-3.3-70b-versatile`) | High-speed Llama 70B for Jury, Critic, and Judge |
| **Intake Agent** | Groq (`llama-3.1-8b-instant`) | Llama 8B for fast, interactive questionnaire chat |
| **Persistence** | Flat-File JSON (`temp_data.json`)| Lightweight, serverless registry for rapid prototyping |

---

## ◈ Local Setup

Requires Python 3.11+ and Node.js 18+.

```bash
# Clone
git clone https://github.com/Mayank-Rohira/JurAI.git
cd JurAI

# Backend Setup
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Configure your GROQ_API_KEY in .env
python app.py

# Frontend Setup (in a separate terminal)
cd frontend
npm install
./node_modules/.bin/tsc --noEmit # Verify TypeScript compilation
npm run dev
```

---

## ◈ API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | API server status check |
| `/ai/chat` | `POST` | Intake conversation proxy for interactive questionnaire |
| `/context/intake` | `POST` | Saves Stage 1 completed questionnaire results and context |
| `/stream/pipeline`| `POST` | SSE endpoint; runs full agent loop and streams real-time reasoning |
| `/run/core` | `POST` | Runs Core Pipeline A (Jury-Critic-Judge) asynchronously |
| `/run/risk` | `POST` | Runs Risk Pipeline B; computes numeric score and drivers |
| `/run/autofix` | `POST` | Runs Autofix Pipeline C; generates engineering fixes |
| `/timeline/{id}` | `GET` | Generates chronological timeline of compliance decisions |
| `/timeline/{id}/report` | `GET` | Generates litigation-ready deviation audit report |

---

## ◈ Repository Structure

```
JurAI/
├── backend/
│   ├── agents/                       Consensus engine
│   │   ├── prompts/                  Jury, critic, and judge prompt configurations
│   │   ├── config.py                 LLM models and Groq API configs
│   │   ├── core.py                   LiteLLM wrapper class & core agent class
│   │   ├── jury_system.py            Consensus loop orchestrator
│   │   └── tools.py                  RAG statute retrieve tool
│   ├── features/                     Core compliance features
│   │   ├── auto_fix/                 Engineering fix generator
│   │   ├── compliance_diff/          Verdict comparator
│   │   ├── compliance_history/       Immutable versioned filesystem storage
│   │   ├── governance/               Human-override controls
│   │   ├── risk_reasoning/           Deterministic scoring engine
│   │   ├── auth.py                   Mock JWT session utilities
│   │   ├── context_store.py          Stage 1 intake database manager
│   │   └── timeline.py               Litigation timeline builder
│   ├── pipeline/                     Pipeline orchestrations
│   │   ├── core_pipeline.py          Pipeline A orchestration
│   │   ├── risk_pipeline.py          Pipeline B orchestration
│   │   └── autofix_pipeline.py       Pipeline C orchestration
│   ├── rag/                          RAG infrastructure
│   │   ├── ingest.py                 Legal text parser and vector ingester
│   │   ├── retrieve.py               ChromaDB similarity search
│   │   └── utils.py                  SentenceTransformers setup
│   ├── app.py                        FastAPI application routes
│   └── temp_data.json                Flat-file local database
│
├── frontend/                         Next.js client
│   ├── app/                          App routing (dashboard, analysis, verdict, timeline)
│   ├── components/                   Tactile UI elements & layout navigation
│   └── lib/                          Localstorage access & backend API client
│
└── docs/                             Platform design and reference context
      projectcontext.md · JurAI_Context.md
```
