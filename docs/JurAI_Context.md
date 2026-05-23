# JurAI_Context.md
> Read this entire file before touching a single line of code. This is everything you need to understand the project and its current state.

---

## What JurAI Is

JurAI is a **compliance lifecycle tracking system** for software product features. It is not a legal chatbot. It records every compliance decision a product feature goes through — from the initial idea to post-launch — so that if a legal issue arises, there is a complete timestamped audit trail ready for regulators or litigators.

It sits **inside** the software development process. Engineers use it when proposing a new feature. Lawyers use it to review and approve that feature. The history of their back-and-forth is what gets stored and tracked.

### The 5 Stages JurAI Tracks

| Stage | What Happens |
|---|---|
| 1. Idea Formation | Engineer describes a proposed feature |
| 2. Initial Legal Review | JurAI runs AI agents to analyse compliance; legal team reviews |
| 3. Revision Tracking | Engineer modifies feature based on feedback; JurAI records changes |
| 4. Final Compliance Verification | Before launch, JurAI verifies the built thing matches the approved design |
| 5. Post-Launch Monitoring | If an issue occurs, JurAI generates the full deviation timeline |

### Two Critical Insights From Stakeholder Interviews

**From an SDE-3 engineer:**
- The biggest pain is the communication gap between engineers (technical language) and lawyers (legal language). JurAI needs to bridge this.
- Every company has internal "Law 0" policies — not formal laws but internal rules like "we don't use Chinese AI models" or "no user data stored in Russia." These must be captured at Stage 1, not discovered later.
- In-house legal teams are faster than outsourced ones because communication is clearer. JurAI should replicate that speed.

**From a litigator:**
- Does not want AI summaries. Would not trust them. Will manually review all documents himself.
- Wants one thing: a **complete chronological timeline** of every action taken, by whom, with the **exact moment of deviation** clearly highlighted — the point where the implementation diverged from the approved compliance plan.
- This timeline is the single most valuable output JurAI can produce. It is what wins or loses cases.
- Companies may be reluctant to put sensitive compliance data into an AI system because AI does not have attorney-client privilege protection. This is a real concern to be aware of.

---

## Repository Structure

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
│   │   ├── compliance_history/       Verdict snapshot history
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

---

## How the Backend Works — Full Technical Detail

### The LLM Stack

The backend uses **LiteLLM** as a universal LLM adapter. The `LiteLlm` class in `agents/core.py` wraps LiteLLM's `completion()` function.

**Current model config in `agents/config.py` — High-speed Groq setup:**
- `llama_model`: `groq/llama-3.3-70b-versatile`
- `mistral_model`: `groq/llama-3.3-70b-versatile` (used for Critic and Judge)
- `standard_model`: `groq/llama-3.1-8b-instant` (used for smaller tasks)

**Feature engines import their model from config via aliases:**
- `risk_engine.py` → imports `mistral_model` → uses it as `risk_model`
- `fix_engine.py` → imports `standard_model` → uses it as `fix_model`
- `diff_engine.py` → imports `mistral_model` → uses it as `diff_model`

### The Agent System

**`Agent` class (`agents/core.py`):**
- Has a `run(message, context, on_log)` method
- Streams the response, collects chunks
- If the model calls a tool (`naiverag_retrieve`), it detects tool call chunks, re-runs non-streamed, executes the tool, feeds the result back, gets a final response
- `on_log` callback emits reasoning steps in real time to the SSE stream

**`jury_system.py` — the orchestration loop:**
```
run_pipeline(context_data)
  └─ run_jury_loop(jury_agent, critic_agent, context_data, max_iterations=2)
       ├─ jury_agent.run() → initial_report
       ├─ critic_agent.run(initial_report) → critique
       │    IF "No major issues found" in critique → STOP
       │    ELSE → jury_agent.run(critique) → refined_report → repeat (max 2x)
       └─ returns (final_report, trace_list)
  └─ judge_agent.run(final_report) → final_verdict (JSON string)
  └─ returns { verdict_json: string, execution_trace: list }
```

### The Three Pipelines

**Pipeline A — Core (`pipeline/core_pipeline.py`):**
1. Calls `run_pipeline(context_data)` from `jury_system.py`
2. Parses the raw JSON string verdict from the judge
3. Fetches previous verdict from file storage
4. Stores new verdict (versioned, immutable JSON files)
5. If previous verdict exists, runs compliance diff
6. Returns: `{ feature_id, run_id, verdict, compliance_diff, metadata, agent_trace }`

**Pipeline B — Risk (`pipeline/risk_pipeline.py`):**
Takes `verdict_data`, calls `generate_risk_assessment()`. Returns risk level (Low/Moderate/High/Critical), risk score (0–100), and drivers list.

**Pipeline C — Autofix (`pipeline/autofix_pipeline.py`):**
Takes `verdict_data + risk_data`, calls `generate_auto_fixes()`. Returns engineering-level fix list with implementation steps.

### The RAG System

- Vector store: **ChromaDB** at `./chroma_db` (already populated with legal documents)
- Embedding model: **HuggingFace `all-MiniLM-L6-v2`** (local, no API needed)
- Legal documents already ingested: GDPR, India DPDP Act, IT Act, Digital Services Act, etc.
- The Jury agent calls this via `naiverag_retrieve_tool` when it needs regulatory text.

### Compliance History Storage

Verdicts are stored as versioned immutable JSON files in `storage/compliance_history/<feature_id>/verdict_XXX.json`.
Each file: `{ feature_id, version, timestamp, verdict, laws_snapshot }`

### Flat File Database (`temp_data.json`)

The backend uses a JSON file instead of a real database for quick iteration. It stores all compliance runs including their traces, risk assessments, and autofixes.

---

## Current State

### What Works
- **Dynamic AI Intake**: `/ai/chat` uses Groq (Llama 3.1 8B) to conduct the strategic intake conversation.
- **Consensus Pipeline**: The Jury → Critic → Judge loop runs using Llama 3.3 70B on Groq.
- **RAG Integration**: Jury correctly retrieves legal text from ChromaDB.
- **Stateful History**: Every run is saved, versioned, and can be diffed.
- **Litigation Support**: `/timeline/{feature_id}/report` generates the complete chronological deviation timeline requested by litigators.
- **Engineering Remediation**: Auto-fix engine translates legal risks into actionable tickets.

### Verification Steps
1. **Start Backend**: `uvicorn app:app --reload --port 8000`
2. **Start Frontend**: `npm run dev` in `frontend/`
3. **Test Intake**: Use the "Begin Analysis" flow on the landing page.
4. **Test Timeline**: View a feature's history to see the litigation report.

---
