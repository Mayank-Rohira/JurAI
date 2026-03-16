# JurAI — Complete AI Codebase Context

> This document is written for an AI assistant that needs to understand, modify, or extend the JurAI codebase. Read this entirely before touching any file.

---

**Stack:** Next.js 14 (App Router) · Python FastAPI · Gemini 2.0 Flash (Google) · DeepSeek Chat · ChromaDB  
**LLM providers:** Google AI Studio (free tier) · DeepSeek (free tier) — no local models, no Ollama

---

## What This App Actually Is

JurAI is a **compliance lifecycle tracking system** for software product features. It is NOT a legal chatbot. The core value proposition is that it records every compliance decision a product feature goes through — from initial idea to post-launch — so that if a legal issue arises, there is a complete, timestamped audit trail ready for regulators or litigators.

The app sits **inside** the software development process. Engineers use it when proposing a new feature. Lawyers use it to review and approve that feature. The full history of their back-and-forth is what gets stored.

### The 5 Stages JurAI Tracks

1. **Idea Formation** — Engineer describes a proposed feature
2. **Initial Legal Review** — JurAI runs AI agents to analyze compliance; legal team reviews the output
3. **Revision Tracking** — Engineer modifies the feature based on legal feedback; JurAI records the changes
4. **Final Compliance Verification** — Before launch, JurAI verifies the built thing matches the approved design
5. **Post-Launch Monitoring** — If an issue occurs, JurAI generates a full deviation timeline

### The Two Most Important Insights From Stakeholder Interviews

**From an SDE-3:** The biggest pain is the communication gap between engineers (who speak in technical architecture) and lawyers (who speak in legal terminology). Also, every company has internal "Law 0" policies — not formal laws, but internal rules like "we don't use Chinese AI models" or "no user data stored in Russia" — that must be captured at Stage 1, not discovered later.

**From a litigator:** Does not want AI summaries — would not trust them. Wants a complete chronological timeline of every action taken, by whom, with the exact moment of deviation highlighted. That timeline is the most valuable output the system can produce.

---

## Repository Structure

```
JurAI-master/
├── backend/                    Python FastAPI backend
│   ├── app.py                  Main entry point, all routes
│   ├── agents/                 The AI agent system
│   │   ├── config.py           Model definitions and agent factory functions
│   │   ├── core.py             LiteLlm wrapper + Agent class
│   │   ├── jury_system.py      Orchestrates Jury → Critic → Judge pipeline
│   │   ├── tools.py            RAG tool definition (naiverag_retrieve_tool)
│   │   └── prompts/            System prompts for each agent role
│   │       ├── jury_prompt.py
│   │       ├── jury_report_critic_prompt.py
│   │       └── jury_final_response_prompt.py
│   ├── pipeline/               Higher-level pipeline orchestration
│   │   ├── core_pipeline.py    Pipeline A: runs agents, stores verdict, runs diff
│   │   ├── risk_pipeline.py    Pipeline B: generates risk assessment
│   │   └── autofix_pipeline.py Pipeline C: generates auto-fix recommendations
│   ├── features/               Standalone feature modules
│   │   ├── compliance_history/ Versioned verdict storage (flat files)
│   │   │   └── history_manager.py
│   │   ├── risk_reasoning/     LLM-based risk scoring
│   │   │   ├── risk_engine.py
│   │   │   └── risk_prompt.py
│   │   ├── auto_fix/           LLM-based fix generation
│   │   │   ├── fix_engine.py
│   │   │   └── fix_prompt.py
│   │   ├── compliance_diff/    LLM-based diff between two verdicts
│   │   │   ├── diff_engine.py
│   │   │   └── diff_prompt.py
│   │   ├── governance/         Human-in-the-loop override logic
│   │   │   └── human_override.py
│   │   └── auth.py             JWT auth helpers (mock login only)
│   ├── rag/                    ChromaDB vector store
│   │   ├── ingest.py           Ingests legal documents into ChromaDB
│   │   ├── retrieve.py         Similarity search over ChromaDB
│   │   └── utils.py            Embedding model + vector store setup
│   ├── database/               Unused in current build (commented out MongoDB)
│   └── temp_data.json          Flat file DB — stores all compliance run records
│
└── frontend/                   Next.js 14 App Router frontend
    ├── app/
    │   ├── layout.tsx           Root layout (Playfair + Inter fonts, ThemeProvider)
    │   ├── page.tsx             Home/landing page
    │   ├── questionnaire/       14-question static intake form (REPLACE THIS)
    │   ├── analysis/            Live agent trace viewer (SSE streaming)
    │   ├── verdict/             Shows compliance verdict + risk assessment
    │   ├── fixes/               Shows auto-fix recommendations
    │   ├── results/             Shows sample compliance issues (mostly placeholder)
    │   ├── dashboard/           Feature cards overview
    │   ├── profile/             User profile (mostly placeholder)
    │   ├── settings/            Settings page (mostly placeholder)
    │   ├── login/               Login page
    │   └── register/            Register page
    ├── components/
    │   ├── TabNavigation.tsx    Tab bar used on verdict/fixes pages
    │   ├── theme-toggle.tsx     Dark/light mode toggle
    │   └── theme-provider.tsx   next-themes wrapper
    └── lib/
        ├── api.ts              All fetch calls to the FastAPI backend
        └── utils.ts            cn() utility (clsx + tailwind-merge)
```

---

## Backend — Deep Dive

### The LLM Stack

The backend uses **LiteLLM** as the universal LLM adapter. The `LiteLlm` class in `agents/core.py` wraps LiteLLM's `completion()` function. This means the model string just needs to follow LiteLLM's provider/model format.

The models are configured in `agents/config.py`. **After migration, the config looks like this:**

```python
# Gemini 2.0 Flash — used for all three agents (Jury, Critic, Judge)
gemini_model = LiteLlm(
    model="gemini/gemini-2.0-flash",
    api_key=os.getenv("GEMINI_API_KEY")
)

# DeepSeek Chat — used for feature engines (risk, fix, diff)
deepseek_model = LiteLlm(
    model="deepseek/deepseek-chat",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

# Aliases — these names are what the rest of the codebase imports
llama_model = gemini_model       # jury agent
mistral_model = gemini_model     # critic + judge agents
standard_model = deepseek_model  # risk, fix, diff engines
```

**Why this model split:** Gemini 2.0 Flash has a 1M token context window — critical for the Jury agent which holds full legal documents from RAG + feature description + conversation history simultaneously. DeepSeek produces cleaner structured step-by-step JSON lists which suits the feature engines.

**Free tier limits:** Gemini — 15 requests/min, 1M tokens/day (aistudio.google.com). DeepSeek — ~100 requests/day free (platform.deepseek.com). A full compliance run costs ~6–9 API calls, well within limits.

**Important — the original codebase had a bug:** The old Ollama config passed the base URL as `api_key` instead of `api_base`. That bug is gone in the new config above.

Three agent factories are defined in `config.py`:
- `create_jury_agent(name, model)` — uses `jury_prompt.PROMPT` + RAG tool, defaults to `gemini_model`
- `create_critic_agent(name, model)` — uses `jury_report_critic_prompt.PROMPT`, no tools, defaults to `gemini_model`
- `create_judge_agent(name, model)` — uses `jury_final_response_prompt.PROMPT`, no tools, defaults to `gemini_model`

### The Agent Class (`agents/core.py`)

The `Agent` class has a `run(message, context, on_log)` method that:
1. Builds a message list with system prompt + context + user message
2. Calls the LLM
3. Handles tool calling in a loop if the LLM invokes `naiverag_retrieve`
4. Calls `on_log(msg)` for real-time streaming of reasoning steps

The `on_log` callback is used by `jury_system.py` to emit SSE events to the frontend.

### The Jury System (`agents/jury_system.py`)

This is the core multi-agent orchestration. The flow is:

```
run_pipeline(context_data)
  └─ run_jury_loop(jury1, critic1, context_data)
       ├─ jury1.run() → initial_report
       ├─ critic1.run(initial_report) → critique
       │    IF critique == "No major issues found." → STOP
       │    ELSE → jury1.run(critique) → refined_report → repeat
       └─ returns (final_report, trace_list)
  └─ judge.run(report1) → final_verdict (JSON string)
  └─ returns { verdict_json: string, execution_trace: list }
```

Max iterations for jury/critic loop: 2 (hardcoded in `run_jury_loop`).

The `on_event` callback emits these event types during execution:
- `jury_thinking` — jury is processing
- `jury_report` — jury produced a report
- `critic_thinking` — critic is reviewing
- `critic_feedback` — critic's critique
- `judge_thinking` — judge is deliberating
- `judge_verdict` — judge's final verdict

### The Three Pipelines

**Pipeline A — Core (`pipeline/core_pipeline.py`)**

This is the main pipeline. It:
1. Calls `run_agents_pipeline(context_data)` from `jury_system.py`
2. Parses the raw JSON string verdict from the judge
3. Fetches the previous verdict from file storage
4. Stores the new verdict (versioned, immutable)
5. If a previous verdict exists, runs the compliance diff
6. Returns: `{ feature_id, run_id, timestamp, verdict, compliance_diff, metadata, agent_trace }`

**Pipeline B — Risk (`pipeline/risk_pipeline.py`)**

Takes a `verdict_data` dict and calls `generate_risk_assessment()`. Returns a risk assessment with `overall_risk` (Low/Moderate/High/Critical), `risk_score` (0–100), and `drivers` (list of specific legal risks). If overall_risk is High or Critical, sets `human_review_required = True`.

**Pipeline C — Autofix (`pipeline/autofix_pipeline.py`)**

Takes `verdict_data` + `risk_data` and calls `generate_auto_fixes()`. Returns a list of engineering-level fixes with `title`, `severity`, `implementation_steps`, `category`, and `affected_jurisdiction`.

### The RAG System (`rag/`)

Uses **ChromaDB** as the vector store and **HuggingFace `all-MiniLM-L6-v2`** as the embedding model.

- Vector store is stored at `./chroma_db` (relative to where the backend is run)
- Collection name: `jurai_rag`
- `retrieve(query, k=4)` does similarity search and returns LangChain `Document` objects
- The Jury agent calls this via the `naiverag_retrieve_tool` when it needs to look up regulatory text

The RAG contains legal documents (GDPR, CCPA, etc.) that were ingested via `rag/ingest.py`. The content of those documents is what the Jury agent quotes when generating its compliance report.

### Compliance History (`features/compliance_history/history_manager.py`)

Verdicts are stored as **versioned immutable JSON files** on disk:

```
storage/compliance_history/
  feat_123/
    verdict_001.json    ← first run
    verdict_002.json    ← second run (after revision)
    verdict_003.json    ← third run
```

Each verdict file contains: `{ feature_id, version, timestamp, verdict, laws_snapshot }`.

Key functions:
- `store_verdict(feature_id, verdict, laws_snapshot)` → writes new version file
- `get_latest_verdict(feature_id)` → reads the most recent file
- `get_previous_verdict(feature_id)` → reads the second-most-recent file
- `list_verdict_history(feature_id)` → returns all versions in order

### Flat File Database (`temp_data.json`)

The backend uses a simple JSON file instead of a real database. It stores:

```json
{
  "users": [],
  "compliance_runs": [
    {
      "run_id": "uuid",
      "feature_id": "feat_123",
      "timestamp": "ISO string",
      "verdict_json": {...},
      "agent_trace": [...],
      "risk_json": {...},
      "autofix_json": {...},
      "status": "CORE_COMPLETED | RISK_COMPLETED | AUTOFIX_COMPLETED | FAILED | IN_PROGRESS"
    }
  ]
}
```

`load_data()` and `save_data()` are helpers in `app.py` that read/write this file.

### API Routes (`app.py`)

| Method | Path | What it does |
|---|---|---|
| POST | `/auth/login` | Returns mock JWT for any username/password |
| POST | `/run/core` | Starts Pipeline A in a background task, returns `run_id` immediately |
| POST | `/run/risk` | Runs Pipeline B synchronously, needs `feature_id` + `run_id` |
| POST | `/run/autofix` | Runs Pipeline C synchronously, has cache — returns existing if already run |
| GET | `/results/{feature_id}/{run_id}` | Returns full result from `temp_data.json` |
| POST | `/stream/pipeline` | SSE endpoint — streams Pipeline A events + runs Risk + Diff in parallel |
| POST | `/admin/import_verdict` | Dev tool to manually import a verdict |

**How the frontend actually uses the backend:**

The Analysis page connects to `/stream/pipeline` via SSE. It sends `context_data` as JSON in the request body. As the agents run, events stream back to the frontend. When the pipeline completes, the SSE stream sends `verdict`, `risk`, `diff`, and finally `done` events.

The Analysis page redirects to `/verdict?feature_id=...&run_id=...` on the `done` event. The Verdict page then calls `GET /results/{feature_id}/{run_id}` to fetch the stored results.

### Authentication

Auth is essentially mocked. `features/auth.py` has `create_access_token()` and `get_password_hash()`. The `/auth/login` route accepts any credentials and returns a JWT. There is no real user database. Auth can be ignored for local development.

### The Compliance Diff (`features/compliance_diff/diff_engine.py`)

Takes two verdicts (previous + current) and uses the LLM to explain what changed and why. This is the automated changelog between compliance runs. Used in Pipeline A when a previous verdict exists for the same `feature_id`.

### The Governance Layer (`features/governance/human_override.py`)

`human_override(ai_verdict, compliance_metrics, reviewer_id, decision, reason, edited_verdict)` applies a human review to an AI verdict. If `legal_risk` is "High" or "Critical", the decision must be "Approved" or "Modified" — "Rejected" alone is not allowed. Returns an `audit_record` with full traceability. This layer is not currently wired into the API routes but exists as a standalone function.

---

## Frontend — Deep Dive

### Tech Stack

- **Next.js 14** with App Router
- **TypeScript** throughout
- **Tailwind CSS** with custom design tokens (see Design System section)
- **Framer Motion** for all animations
- **Lucide React** for icons

### Design System

**Custom Tailwind colors:**
```
parchment  #FDFCFB   Light mode background / dark mode text
charcoal   #2D2D2D   Dark mode background / light mode text
teal       #0D5C63   Primary brand color — CTAs, active states, links
slate      #4A5568   Secondary text, labels, placeholders
gold       #C5A059   Accents, step indicators, highlights
```

**Typography:**
- Serif: Playfair Display (`font-serif`) — page titles, headings, hero text
- Sans: Inter (`font-sans`) — body, labels, UI controls
- Mono: System monospace (`font-mono`) — session IDs, code, technical values

**Recurring UI patterns:**
- Cards: `bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-sm`
- Page bg: `bg-parchment dark:bg-[#0A0A0A]`
- Active/selected: `bg-teal text-parchment`
- Hover: `hover:border-teal/50 hover:bg-teal/5`
- Animation: Framer Motion with `ease: "circOut"`, `duration: 0.4`

**Dark mode:** Implemented via `next-themes`. Uses `class` strategy (adds `dark` to `<html>`). ThemeProvider wraps the entire app in `layout.tsx`.

### Page-by-Page Breakdown

**`app/page.tsx` — Home/Landing**
Marketing page. Has a scroll-based parallax hero using Framer Motion's `useScroll` and `useTransform`. Has a login/register modal. The main CTA buttons link to `/questionnaire` and `/dashboard`. Currently has placeholder content and a sign-in modal.

**`app/questionnaire/page.tsx` — Intake Form (NEEDS REPLACEMENT)**
The current implementation is a static array of 14 `QUESTIONS` objects. Each has `id`, `title`, `question`, `type` (text/textarea/select/multiselect), and optionally `conditional` (to skip based on a previous answer). Navigation is manual (Previous/Next buttons). On submit, data is saved to `localStorage` as `pipeline_context` and the user is redirected to `/analysis`. This page also supports uploading a pre-filled JSON file to auto-populate answers.

**`app/analysis/page.tsx` — Live Agent Trace**
Connects to `POST /stream/pipeline` via SSE. The body is the `pipeline_context` from localStorage. As SSE events arrive, it routes them to the correct agent card:
- `jury_thinking` / `jury_report` → "Regulation Detective" card
- `critic_thinking` / `critic_feedback` → "Design Counsel" card
- `judge_thinking` / `judge_verdict` → "Compliance Validator" card

Each agent card shows a pulsing animation while active and collects thought strings in `agentThoughts` state. On the `done` SSE event, redirects to `/verdict?feature_id=...&run_id=...`.

**`app/verdict/page.tsx` — Verdict Display**
Reads `run_id` and `feature_id` from URL params. Calls `GET /results/{feature_id}/{run_id}`. Parses the `verdict` object (handles both string and object, handles nested JSON). Displays:
- Metrics bar: confidence, risk score, critical count, total issues, time taken
- Detected issues list (with severity badges, expandable)
- Legal evidence list (with jurisdiction flags, expandable)
- Risk assessment section (from `risk_assessment` field)
Uses `TabNavigation` component to switch between Verdict and Fixes pages.

**`app/fixes/page.tsx` — Auto-Fix Recommendations**
Same URL params as verdict. Calls `GET /results/{feature_id}/{run_id}`. If `auto_fix` is missing from results, calls `POST /run/autofix` to generate it (the API has caching so this is safe to call multiple times). Displays each fix as an expandable card with `implementation_steps`. Uses `TabNavigation`.

**`app/results/page.tsx` — Compliance Issues (Placeholder)**
Shows hardcoded `SAMPLE_ISSUES` data — not connected to the backend. Essentially a UI demo.

**`app/dashboard/page.tsx` — Dashboard (Placeholder)**
Shows three static cards linking to Questionnaire, Results, and Fixes. Not connected to any real data.

**`app/login/page.tsx` and `app/register/page.tsx`**
Standard auth forms. Call `/auth/login` and `/auth/register` respectively. Store token in localStorage as `token`. Mostly functional but auth is mocked so any credentials work.

### `lib/api.ts` — API Client

All backend calls go through this module. Key methods:
- `api.auth.register(data)` — POST `/auth/register`
- `api.auth.login(formData)` — POST `/auth/login` (FormData, not JSON)
- `api.pipeline.runCore(data, token)` — POST `/run/core`
- `api.pipeline.getResults(featureId, runId)` — GET `/results/{featureId}/{runId}`
- `api.pipeline.runAutofix(featureId, runId)` — POST `/run/autofix`

The `API_BASE_URL` defaults to `http://localhost:8000` and can be overridden with `NEXT_PUBLIC_API_URL`.

The SSE connection in `analysis/page.tsx` is built directly with `fetch()` + `ReadableStream` — it does NOT go through the `api` module.

### How LocalStorage Is Currently Used

The questionnaire saves the intake data to localStorage as `pipeline_context`:

```js
localStorage.setItem("pipeline_context", JSON.stringify({
  ...textInputs,
  ...answers,
  feature_id: featureId,
  timestamp: new Date().toISOString()
}));
```

The analysis page reads `pipeline_context` and sends it as the body to `/stream/pipeline`.

**This is the context persistence problem:** there is only one slot (`pipeline_context`). Each new questionnaire run overwrites it. There is no way to have multiple features in progress simultaneously, and no way to return to a previous feature's data.

---

## Data Flow — End to End

Here is the complete data flow for a single compliance run:

```
1. User fills questionnaire (frontend)
   └─ Data saved to localStorage["pipeline_context"]
   └─ Redirect to /analysis

2. Analysis page loads (frontend)
   └─ Reads localStorage["pipeline_context"]
   └─ Opens SSE connection to POST /stream/pipeline
      Body: the full context_data object

3. /stream/pipeline (backend, app.py)
   └─ Spins up event_generator() async generator
   └─ Runs core_pipeline in a thread pool executor
      └─ run_core_pipeline(context_data)
         └─ run_agents_pipeline(context_data)  ← jury_system.py
            └─ Jury agent runs → calls naiverag_retrieve_tool
               └─ retrieve(query) → ChromaDB similarity search → legal docs
            └─ Critic agent reviews jury report
            └─ Judge agent merges into final verdict JSON
         └─ Parses verdict JSON
         └─ Stores verdict to storage/compliance_history/{feature_id}/verdict_NNN.json
         └─ Runs compliance diff (if previous verdict exists)
         └─ Returns { feature_id, run_id, verdict, compliance_diff, agent_trace }
   └─ Persists result to temp_data.json
   └─ Streams SSE events: status → verdict → risk → diff → done

4. Frontend receives SSE events
   └─ Routes events to correct agent card UI
   └─ On "done" event: redirects to /verdict?feature_id=X&run_id=Y

5. Verdict page loads (frontend)
   └─ Reads feature_id + run_id from URL
   └─ Calls GET /results/{feature_id}/{run_id}
      └─ Reads from temp_data.json
      └─ Returns verdict, risk_assessment, agent_trace, status

6. User navigates to Fixes tab
   └─ Calls POST /run/autofix (if auto_fix missing)
      └─ Runs autofix_pipeline
         └─ generate_auto_fixes(verdict, risk, context)
         └─ Returns engineering-level fix list
   └─ Stores autofix_json back to temp_data.json
```

---

## What Needs to Change (Summary for AI Context)

### 1. Cloud LLM Migration (Gemini + DeepSeek)

**Where models are configured:** `backend/agents/config.py`

**All three feature engines import their model from config:**
- `risk_engine.py` → `from agents.config import mistral_model` → `risk_model = mistral_model` → now **Gemini**
- `fix_engine.py` → `from agents.config import standard_model` → `fix_model = standard_model` → now **DeepSeek**
- `diff_engine.py` → `from agents.config import mistral_model` → `diff_model = mistral_model` → now **Gemini**

**The fix:** Replace `config.py` entirely with the Gemini + DeepSeek config. All three feature engines pick up the new models automatically via the alias names — no changes to the engine files themselves.

**Two additions to `app.py`:** Add `load_dotenv()` at the very top. Add `POST /ai/chat` proxy route that calls Gemini server-side.

**Frontend questionnaire change:** `questionnaire/page.tsx` currently calls `https://api.anthropic.com/v1/messages` directly from the browser. Replace with a call to `POST /ai/chat` on `http://localhost:8000` — a proxy route that keeps the API key server-side.

**New env files:** `backend/.env` with `GEMINI_API_KEY` + `DEEPSEEK_API_KEY`. `frontend/.env.local` with only `NEXT_PUBLIC_API_URL=http://localhost:8000` — no AI keys in frontend.

### 2. Dynamic Questionnaire

**File to rewrite:** `frontend/app/questionnaire/page.tsx`

The entire `QUESTIONS` array and step-based navigation goes away. Replace with:
- A `messages: Message[]` state array (conversation history)
- A `turns: QuestionTurn[]` array tracking collected field keys and answers
- A function `askNextQuestion(history, turns)` that calls `POST /ai/chat` with the system prompt and full conversation history
- The system prompt instructs Gemini to ask one question at a time and output `{"done": true, "summary": "..."}` when finished
- When `done` is detected: show summary card + submit button

The system prompt must include the list of collected fields so far (so the AI doesn't re-ask).

### 3. Context Persistence

**New file to create:** `frontend/lib/context.ts`

**The data structure** stored in `localStorage["jurai_features"]` is a dictionary of `feature_id → FeatureContext`. Each `FeatureContext` holds:
- Basic metadata: `feature_id`, `feature_name`, `created_at`, `updated_at`, `current_stage`
- Stage 1 intake: full conversation array + collected field map + AI summary
- Stage 2 legal review: `run_id`, verdict, risk assessment, approval status
- Stage 3 revisions: array of revision records
- Stage 4 final verification: run_id, verdict, pass/fail
- Stage 5 post-launch: launched_at, incidents array

**The old `pipeline_context` key must be replaced.** All pages that currently read `pipeline_context` should instead read from `getFeature(featureId)` using the feature_id from the URL.

### 4. App Redesign

**New page to create:** `frontend/app/timeline/page.tsx`
This is the chronological event log the litigator requested. Shows every action taken on a feature in order, with deviation highlighting.

**Pages to rewrite:**
- `dashboard/page.tsx` → feature lifecycle cards with stage progress indicators
- `questionnaire/page.tsx` → AI chat interface (see point 2)

**Pages to redesign (keep logic, change layout):**
- `analysis/page.tsx` → cleaner agent cards, better visual hierarchy
- `verdict/page.tsx` → stage-aware header, better issue cards
- `fixes/page.tsx` → "Mark as Implemented" tracking, stage-aware CTA

**Pages to lightly update:**
- `page.tsx` (home) → updated copy + dashboard CTA

---

## Key Gotchas and Warnings

**1. The judge outputs a JSON string, not a JSON object.**
`_parse_verdict()` in `core_pipeline.py` handles three cases: it's already a dict, it's a string that parses directly, or it's a string wrapped in markdown code fences. Always use `_parse_verdict()` when handling judge output. Never assume it's already a clean dict.

**2. `temp_data.json` is the runtime database.**
It lives at `backend/temp_data.json` (relative to where `uvicorn` is run). If this file gets corrupted or deleted, all run history is lost. The compliance history in `storage/compliance_history/` is separate and is not affected.

**3. Two separate storage systems exist and serve different purposes.**
- `temp_data.json` → stores pipeline runs (verdict + risk + trace + status) for the API to serve
- `storage/compliance_history/{feature_id}/verdict_NNN.json` → stores versioned, immutable verdicts for diff comparison and history
These are not in sync by design. The compliance history is the source of truth for legal audit. `temp_data.json` is the API cache layer.

**4. The SSE endpoint (`/stream/pipeline`) does NOT use `run_id` from `/run/core`.**
`/run/core` creates a record in `temp_data.json` with a UUID `run_id` before the pipeline runs. `/stream/pipeline` runs the pipeline inline and generates its own `run_id` via `run_core_pipeline`. The two flows are independent. The frontend uses `/stream/pipeline` exclusively (not `/run/core`).

**5. `feature_id` must be present in `context_data` before calling the pipeline.**
`run_core_pipeline` will raise `ValueError("feature_id missing")` if it can't find `feature_id` in either the context data or the verdict output. The questionnaire must always generate and include a `feature_id` before submitting.

**6. The Jury agent has a tool calling loop.**
When the jury agent calls `naiverag_retrieve`, the `Agent.run()` method handles the tool invocation and feeds the result back as a `tool` message. This loop continues until the model stops calling tools. The tool calling format follows OpenAI function calling format (which LiteLLM normalizes).

**7. Gemini tool calling — function calling format must match.**
Gemini supports function/tool calling via LiteLLM's normalized interface. The `naiverag_retrieve_tool` schema uses OpenAI function calling format, which LiteLLM translates to Gemini's format automatically. If tool calls fail silently, check that `tool_choice: "auto"` is being passed and that the tool schema is valid OpenAI format.

**8. The `compliance_diff` only runs if a previous verdict exists.**
On the very first run of a feature (`verdict_001.json`), `get_previous_verdict()` returns `None` and the diff is skipped. The diff becomes available from the second run onward. This is by design — you need at least two states to diff.

**9. Dark mode classes must always be paired.**
Every element needs both light and dark variants: `bg-white dark:bg-[#151515]`, `text-charcoal dark:text-parchment`, etc. The ThemeProvider uses the `class` strategy, not `media` strategy.

**10. Never expose API keys in the frontend.**
The questionnaire calls `POST /ai/chat` on the backend — not Gemini directly. The backend proxy is what holds `GEMINI_API_KEY`. The frontend `.env.local` only contains `NEXT_PUBLIC_API_URL`. If an AI key ends up in a `NEXT_PUBLIC_` variable, it will be visible to anyone who opens the browser dev tools.

**11. `load_dotenv()` must be called before any `os.getenv()` in the backend.**
Place `from dotenv import load_dotenv; load_dotenv()` at the very top of `app.py`, before any other imports. If it runs after the config modules are imported, `os.getenv("GEMINI_API_KEY")` will return `None` and all LLM calls will fail with auth errors.

---

## The Verdict JSON Schema

This is what the Judge agent is instructed to output (from `jury_final_response_prompt.py`):

```json
{
  "feature": "string — feature name",
  "needs_geo_specific_logic": "boolean",
  "confidence": "number 0.0–1.0",
  "risk_score": "number 0–100",
  "compliance_score": "number 0–100",
  "summary": "string — executive summary",
  "issues": [
    {
      "title": "string",
      "description": "string",
      "severity": "Critical | High | Medium | Low",
      "risk_score": "number 0–100",
      "category": "string e.g. Data Privacy",
      "impact": "string e.g. GDPR Fines",
      "remediation": "string — high-level fix"
    }
  ],
  "evidence_cited": [
    {
      "source": "string e.g. GDPR",
      "citation": "string e.g. Article 6(1)(a)",
      "content": "string — actual snippet",
      "jurisdiction": "string e.g. EU",
      "frameworks": ["string"]
    }
  ]
}
```

## The Risk Assessment JSON Schema

Output by `risk_engine.py` (from `risk_prompt.py`):

```json
{
  "risk_assessment": {
    "overall_risk": "Low | Moderate | High | Critical",
    "risk_score": "number 0–100",
    "confidence": "number 0.0–1.0",
    "summary": "string",
    "drivers": [
      {
        "law": "string",
        "jurisdiction": "string",
        "clause": "string",
        "reason": "string",
        "severity": "Low | Moderate | High | Critical"
      }
    ]
  }
}
```

## The Auto-Fix JSON Schema

Output by `fix_engine.py` (from `fix_prompt.py`):

```json
{
  "auto_fix": {
    "summary": "string — executive summary",
    "fixes": [
      {
        "title": "string",
        "severity": "Critical | High | Medium | Low",
        "description": "string — one sentence",
        "issue_reference": "string — why this is a legal problem",
        "remediation_strategy": "string — technical approach",
        "implementation_steps": ["string"],
        "category": "UI | Data | Logic | Governance",
        "affected_jurisdiction": "string e.g. EU"
      }
    ]
  }
}
```

---

## Running the App Locally

### Prerequisites
- macOS (M-series or any modern machine)
- Python 3.10+
- Node.js 18+
- Free Gemini API key from `aistudio.google.com`
- Free DeepSeek API key from `platform.deepseek.com`

### Start Commands (two terminals — no Ollama needed)

```bash
# Terminal 1
cd backend
uvicorn app:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

App: `http://localhost:3000`
Backend: `http://localhost:8000`

### Install Backend Dependencies
```bash
cd backend
pip install fastapi uvicorn litellm sse-starlette chromadb \
            langchain langchain-chroma langchain-huggingface \
            python-dotenv
```

### Backend `.env` File (create this, never commit it)
```env
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
```

### Frontend `.env.local` File (safe to commit)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Verify Setup
```bash
# Backend alive
curl http://localhost:8000/results/test/test
# Expected: 404 "Result not found"

# Gemini proxy works
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "say hello"}], "system_prompt": "You are helpful."}'
# Expected: {"content": "Hello! ..."}
```

---

## What the App Does NOT Have (Don't Add These)

- Real authentication — the mock auth is intentional for local dev
- A real database — `temp_data.json` is the intended storage for now
- Multi-user support — single user, local tool only
- Cloud deployment config — the backend runs locally even though it calls cloud APIs
- Rate limiting or retry logic — free tier limits are sufficient for development
- A mobile app — web only
- Any local/offline AI models — Ollama is no longer part of this project
