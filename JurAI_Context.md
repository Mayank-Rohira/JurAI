# JurAI_Context.md
> Read this entire file before touching a single line of code. This is everything you need to understand the project, its current state, and exactly what to build next.

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
JurAI-master/
├── backend/
│   ├── app.py                        Main FastAPI app — all routes live here
│   ├── requirements.txt              Python dependencies
│   ├── temp_data.json                Flat-file database — stores all pipeline runs
│   ├── agents/
│   │   ├── config.py                 Model definitions + agent factory functions
│   │   ├── core.py                   LiteLlm wrapper class + Agent class
│   │   ├── jury_system.py            Orchestrates Jury → Critic → Judge loop
│   │   ├── tools.py                  RAG tool (naiverag_retrieve_tool)
│   │   └── prompts/
│   │       ├── jury_prompt.py
│   │       ├── jury_report_critic_prompt.py
│   │       └── jury_final_response_prompt.py
│   ├── pipeline/
│   │   ├── core_pipeline.py          Pipeline A — runs agents, stores verdict, runs diff
│   │   ├── risk_pipeline.py          Pipeline B — generates risk assessment
│   │   └── autofix_pipeline.py       Pipeline C — generates auto-fix recommendations
│   ├── features/
│   │   ├── compliance_history/       Versioned verdict storage (flat files on disk)
│   │   │   └── history_manager.py
│   │   ├── risk_reasoning/
│   │   │   ├── risk_engine.py
│   │   │   └── risk_prompt.py
│   │   ├── auto_fix/
│   │   │   ├── fix_engine.py
│   │   │   └── fix_prompt.py
│   │   ├── compliance_diff/
│   │   │   ├── diff_engine.py
│   │   │   └── diff_prompt.py
│   │   ├── governance/
│   │   │   └── human_override.py     Human-in-the-loop override (not yet wired into routes)
│   │   └── auth.py                   JWT helpers — mock login only
│   ├── rag/
│   │   ├── ingest.py                 Ingests legal docs into ChromaDB
│   │   ├── retrieve.py               Similarity search over ChromaDB
│   │   └── utils.py                  Embedding model + vector store setup
│   ├── database/
│   │   ├── database.py               DEAD CODE — old MongoDB connection, nothing imports this
│   │   └── models.py                 DEAD CODE — old MongoDB models, nothing imports this
│   └── chroma_db/                    Persisted vector store (legal documents already ingested)
│
└── frontend/                         Next.js 14 frontend (not the focus right now)
```

---

## How the Backend Works — Full Technical Detail

### The LLM Stack

The backend uses **LiteLLM** as a universal LLM adapter. The `LiteLlm` class in `agents/core.py` wraps LiteLLM's `completion()` function. The model string just needs to follow LiteLLM's `provider/model-name` format.

**Current model config in `agents/config.py` — this is the original Ollama setup:**
```python
# All three agents currently point to local Ollama
llama_model  = LiteLlm(model="ollama/mistral:7b-instruct", api_key="http://localhost:11434")
mistral_model = LiteLlm(model="ollama/mistral:7b-instruct", api_key="http://localhost:11434")
standard_model = LiteLlm(model="ollama/qwen3:4b", api_key="http://localhost:11434")
```

Note: `api_key` is being misused here — for Ollama the correct LiteLLM param is `api_base`, not `api_key`. This is a pre-existing bug in the original codebase.

**Feature engines import their model from config via aliases:**
- `risk_engine.py` → imports `mistral_model` → uses it as `risk_model`
- `fix_engine.py` → imports `standard_model` → uses it as `fix_model`
- `diff_engine.py` → imports `mistral_model` → uses it as `diff_model`

This means changing `config.py` is the only thing needed to change what model all five engines use.

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

SSE events emitted during the loop:
- `jury_thinking`, `jury_report` → routes to Jury card in frontend
- `critic_thinking`, `critic_feedback` → routes to Critic card
- `judge_thinking`, `judge_verdict` → routes to Judge card

### The Three Pipelines

**Pipeline A — Core (`pipeline/core_pipeline.py`):**
1. Calls `run_pipeline(context_data)` from `jury_system.py`
2. Parses the raw JSON string verdict from the judge (`_parse_verdict()` handles string/dict/markdown-fenced)
3. Fetches previous verdict from file storage
4. Stores new verdict (versioned, immutable JSON files)
5. If previous verdict exists, runs compliance diff
6. Returns: `{ feature_id, run_id, verdict, compliance_diff, metadata, agent_trace }`

**Pipeline B — Risk (`pipeline/risk_pipeline.py`):**
Takes `verdict_data`, calls `generate_risk_assessment()`. Returns risk level (Low/Moderate/High/Critical), risk score (0–100), and drivers list.

**Pipeline C — Autofix (`pipeline/autofix_pipeline.py`):**
Takes `verdict_data + risk_data`, calls `generate_auto_fixes()`. Returns engineering-level fix list with implementation steps. Has caching — returns existing result if already run for this `run_id`.

### The RAG System

- Vector store: **ChromaDB** at `./chroma_db` (already populated with legal documents)
- Embedding model: **HuggingFace `all-MiniLM-L6-v2`** via `langchain-huggingface` (local, no API needed)
- Legal documents already ingested: GDPR, India DPDP Act, IT Act, Digital Services Act, Florida state law, Utah Social Media Regulation Act, COPPA-related US law, and others
- `retrieve(query, k=4)` does similarity search and returns LangChain `Document` objects
- The Jury agent calls this via `naiverag_retrieve_tool` when it needs regulatory text

**Important:** The ChromaDB is already populated. Do NOT re-run ingest unless explicitly told to. The `chroma_db/` folder in the repo contains the existing vector data.

### Compliance History Storage

Verdicts are stored as versioned immutable JSON files:
```
storage/compliance_history/
  feat_123/
    verdict_001.json   ← first run
    verdict_002.json   ← second run (after revision)
```
Each file: `{ feature_id, version, timestamp, verdict, laws_snapshot }`

Key functions in `history_manager.py`:
- `store_verdict(feature_id, verdict, laws_snapshot)` → writes new version file
- `get_latest_verdict(feature_id)` → most recent file
- `get_previous_verdict(feature_id)` → second-most-recent (used for diff)
- `list_verdict_history(feature_id)` → all versions in order

### Flat File Database (`temp_data.json`)

The backend uses a JSON file instead of a real database. Structure:
```json
{
  "users": [],
  "compliance_runs": [
    {
      "run_id": "uuid",
      "feature_id": "feat_123",
      "timestamp": "ISO string",
      "verdict_json": {},
      "agent_trace": [],
      "risk_json": {},
      "autofix_json": {},
      "status": "CORE_COMPLETED | RISK_COMPLETED | AUTOFIX_COMPLETED | FAILED | IN_PROGRESS"
    }
  ]
}
```

### API Routes (`app.py`)

| Method | Path | What It Does |
|---|---|---|
| POST | `/auth/login` | Returns mock JWT for any credentials |
| POST | `/run/core` | Starts Pipeline A in background, returns `run_id` immediately |
| POST | `/run/risk` | Runs Pipeline B synchronously |
| POST | `/run/autofix` | Runs Pipeline C synchronously, cached |
| GET | `/results/{feature_id}/{run_id}` | Returns full result from `temp_data.json` |
| POST | `/stream/pipeline` | SSE endpoint — streams all pipeline events in real time |

The frontend uses `/stream/pipeline` exclusively (not `/run/core`). It sends `context_data` as JSON body and receives SSE events. On the `done` event it redirects to the verdict page.

---

## Current State — What Works, What Doesn't, What Needs Changing

### What Works (proven by logs)
- The full Jury → Critic → Judge pipeline runs end to end
- The RAG tool is called correctly by the Jury agent
- Risk assessment generates correctly
- Autofix generates (occasionally fails JSON parsing with smaller models)
- Compliance history versioning works
- SSE streaming works
- The flat file database works

### Known Bugs in the Original Codebase

**1. `api_key` vs `api_base` for Ollama in `config.py`:**
The `LiteLlm` constructor is called with `api_key="http://localhost:11434"` for Ollama. The correct LiteLLM parameter is `api_base`. It happens to work in some versions of LiteLLM but is semantically wrong and will break on updates. Fix this when replacing models.

**2. Dead code in `database/`:**
`database/database.py` and `database/models.py` are MongoDB files from an earlier version. Nothing imports them. They can be deleted entirely.

**3. Dead dependencies in `requirements.txt`:**
- `pymongo` — MongoDB driver, not used
- `google-genai` — Google's newer SDK, not used (the project uses LiteLLM which handles Gemini internally)
These can be removed.

**4. No `load_dotenv()` call in `app.py`:**
The original `app.py` does not call `load_dotenv()`. This means `.env` file values are not loaded on startup. Any API key stored in `.env` will not be picked up by `os.getenv()` unless the environment variable is set another way.

---

## The Plan — Option 3 (Hybrid: Local Pipeline + Gemini Questionnaire)

This is what needs to be built. The concept is simple:

- **The compliance pipeline (Jury, Critic, Judge, Risk, Fix, Diff)** stays on local Ollama. It is reliable, has no rate limits, costs nothing, and already works. No changes to the pipeline.
- **The dynamic questionnaire chat** uses the Gemini free API. The questionnaire is lightweight (500 tokens per session, ~10 back-and-forth messages). This is well within Gemini's free tier (15 requests/minute, 1M tokens/day).
- The Gemini API key **never touches the frontend**. The frontend calls a backend proxy route (`POST /ai/chat`) which makes the Gemini call server-side.

### What the Dynamic Questionnaire Is

Replace the current static 14-question form with a conversational AI intake. Instead of showing fixed questions one by one, JurAI has a chat conversation with the engineer. It asks one question at a time, where each question is informed by the previous answer. When it has collected enough information across all required topics, it outputs a JSON signal `{"done": true, "summary": "...", "collected": {...}}` and the conversation ends.

**Information that must be collected (10 topics):**

| Field Key | What to Ask |
|---|---|
| `feature_name` | What is the feature called? |
| `feature_description` | What does it do? Who uses it? |
| `jurisdictions` | Which countries/regions will it be available in? |
| `data_collected` | What personal data does it collect or process? |
| `data_storage` | How long is data stored and where? |
| `user_consent` | Do users explicitly consent? Can they opt out? |
| `uses_ai` | Does it use AI or automated decision-making? |
| `ai_impact` | If AI — can it significantly affect users (restrict access, remove content)? |
| `law0_policies` | Any internal company rules — vendor bans, data residency rules, prohibited tech? |
| `legal_concerns` | Any known legal, privacy, or ethical concerns? |

Law 0 is a critical field — it covers internal company policies that are not formal laws but must always be followed (e.g. "we never use Chinese AI models", "no user data stored in Russia"). This came directly from the SDE-3 interview and must be captured.

**Questionnaire system prompt:**
```
You are JurAI's intake agent. Your job is to learn about a software product feature
so a compliance analysis can be performed.

You ask ONE short question at a time. Never ask multiple questions in a single message.
Each question must build naturally on the previous answer.

INFORMATION TO COLLECT (adapt order to the conversation):
feature_name, feature_description, jurisdictions, data_collected, data_storage,
user_consent, uses_ai, ai_impact, law0_policies, legal_concerns

RULES:
- Keep questions short (1-2 sentences max).
- Ask one focused follow-up if an answer is vague, then move on.
- Once all 10 topics are covered, output ONLY this JSON and nothing else:
  {"done": true, "summary": "<2-3 sentence plain English summary>", "collected": {<field_key: answer pairs>}}
- Never ask more than 12 questions total. Wrap up by question 12 regardless.
- Never repeat a question already answered.
- Professional but approachable. No legal jargon.

ALREADY COLLECTED:
{dynamically injected list of field_key: answer pairs updated after each turn}
```

### Exact Changes to Make

There are exactly **4 changes** to make to the original codebase. Nothing else.

---

#### Change 1 — `backend/app.py`: Add `load_dotenv()` at the very top

The very first two lines of `app.py` must be:
```python
from dotenv import load_dotenv
load_dotenv()
```
Place these before any other import. If `load_dotenv()` runs after the config modules are imported, `os.getenv("GEMINI_API_KEY")` will return `None` and the `/ai/chat` route will fail.

---

#### Change 2 — `backend/app.py`: Add the `/ai/chat` proxy route

Add these two Pydantic models and this route to `app.py`. Place them after the existing Pydantic models (`PipelineRequest`, `RiskRequest`, etc.) and before the auth routes:

```python
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system_prompt: str

@app.post("/ai/chat")
async def ai_chat(request: ChatRequest):
    """
    Proxy route for the dynamic questionnaire.
    Calls Gemini on behalf of the frontend so the API key stays server-side.
    Never expose GEMINI_API_KEY to the browser.
    """
    import litellm

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("/ai/chat called but GEMINI_API_KEY is not set in .env")
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server. Add it to your .env file."
        )

    full_messages = [{"role": "system", "content": request.system_prompt}] + [
        {"role": m.role, "content": m.content} for m in request.messages
    ]

    try:
        response = litellm.completion(
            model="gemini/gemini-2.0-flash",
            messages=full_messages,
            api_key=api_key,
            max_tokens=400
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Gemini returned an empty response")
        return {"content": content}

    except Exception as e:
        logger.error(f"/ai/chat Gemini call failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI chat failed: {type(e).__name__}: {str(e)}"
        )
```

**Why the messages are converted with `{"role": m.role, "content": m.content}`:**
`request.messages` is a list of `ChatMessage` Pydantic objects. LiteLLM expects plain dicts. Passing Pydantic objects directly to LiteLLM will cause a type error. Always convert them.

---

#### Change 3 — Create `backend/.env`

Create this file in the `backend/` directory. Add it to `.gitignore` immediately:

```env
# Google Gemini — free key at aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here
```

Get the key at `aistudio.google.com` → Get API Key → Create API key. It starts with `AIza...`. Free tier: 15 requests/minute, 1M tokens/day.

**Do not add DeepSeek or any other key right now. Just Gemini.**

---

#### Change 4 — `backend/requirements.txt`: Add `python-dotenv`, remove dead deps

Add this line (needed for `load_dotenv()`):
```
python-dotenv
```

Remove these lines (dead dependencies):
```
pymongo
google-genai
```

The rest of `requirements.txt` stays exactly as is. Do not remove `langchain-huggingface` or `sentence-transformers` — the RAG system still uses these for local embeddings and the ChromaDB is already built with them.

---

### What Does NOT Change

Everything else in the backend stays exactly as it is:

- `agents/config.py` — keep all Ollama model references unchanged
- `agents/core.py` — no changes
- `agents/jury_system.py` — no changes
- `agents/tools.py` — no changes
- `agents/prompts/` — no changes
- `pipeline/` — no changes
- `features/` — no changes
- `rag/` — no changes
- `database/` — leave the dead files for now, they cause no harm
- `chroma_db/` — do not touch, already populated
- `storage/` — do not touch, contains real compliance run history

The Ollama pipeline is working. Do not touch it.

---

## Verification Steps After Making the Changes

Do these in order after the four changes are made:

**Step 1 — Confirm Ollama is running:**
```bash
ollama serve
# In another terminal:
curl http://localhost:11434/api/tags
# Should return JSON listing installed models
```

**Step 2 — Start the backend:**
```bash
cd backend
uvicorn app:app --reload --port 8000
```
There should be no import errors on startup.

**Step 3 — Test the Gemini proxy:**
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hello"}],
    "system_prompt": "You are a helpful assistant. Say hello back."
  }'
```
Expected response: `{"content": "Hello! ..."}` — Gemini responding through the backend proxy.

If this fails, check the server terminal for the exact error. The error handling in the route will print the full exception type and message.

**Step 4 — Test the Ollama pipeline still works:**
```bash
curl -X POST http://localhost:8000/run/core \
  -H "Content-Type: application/json" \
  -d '{
    "context_data": {
      "feature_id": "test_001",
      "feature": "User login",
      "feature_description": "Basic email and password login",
      "target_region": "EU"
    }
  }'
```
Expected: returns `{"run_id": "...", "feature_id": "test_001", "status": "IN_PROGRESS"}` immediately. Check `temp_data.json` after ~2 minutes — the run should have status `CORE_COMPLETED` with a verdict.

Both tests passing = hybrid setup is working correctly.

---

## Key Gotchas — Read Before Touching Anything

**1. `load_dotenv()` must be the very first thing in `app.py`.**
If it runs after any module import that calls `os.getenv()`, those calls will get `None`. Python imports are cached — once a module runs `os.getenv("GEMINI_API_KEY")` at import time and gets `None`, it keeps `None` for the entire session even if you call `load_dotenv()` later.

**2. The judge outputs a JSON string, not a JSON object.**
`_parse_verdict()` in `core_pipeline.py` handles this. It tries direct JSON parse, then strips markdown fences, then finds the outermost `{}`. Always use this function. Never assume the judge output is already a clean dict.

**3. The Jury agent's tool calling loop.**
When the Jury calls `naiverag_retrieve`, the `Agent.run()` method detects tool call chunks in the stream, re-runs the model non-streamed to get a clean tool call, executes the RAG lookup, feeds the result back, and gets a final response. This is all handled in `core.py`. Do not modify this flow.

**4. `feature_id` must be in `context_data` before calling the pipeline.**
`run_core_pipeline` raises `ValueError("feature_id missing")` if it cannot find `feature_id` in either the context data or the verdict output. The questionnaire must always generate and include a `feature_id`.

**5. The ChromaDB is already populated — do not re-run ingest.**
The `chroma_db/` folder contains the vector data for all the legal documents. Running `ingest.py` again will duplicate all the documents. Only run it if you are adding new legal documents to `rag/input_files/`.

**6. Two separate storage systems — do not confuse them.**
- `temp_data.json` → pipeline run records (verdict + risk + trace + status) — what the API serves
- `storage/compliance_history/` → versioned immutable verdicts — the legal audit trail
They are separate by design. `temp_data.json` is the API cache. `storage/compliance_history/` is the source of truth for legal history.

**7. `mistral_model` and `standard_model` aliases are used throughout.**
`risk_engine.py`, `fix_engine.py`, and `diff_engine.py` all import these aliases from `config.py`. If you ever change `config.py` in the future, preserve these alias names or update all three engine files.

**8. The SSE endpoint (`/stream/pipeline`) is what the frontend actually uses.**
`/run/core` exists but the frontend does not call it. The full pipeline runs via `/stream/pipeline` which streams events in real time and persists results to `temp_data.json` on completion.

---

## Running the Full Stack

```bash
# Terminal 1 — Ollama (keep running)
ollama serve

# Terminal 2 — Backend
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Terminal 3 — Frontend (when ready)
cd frontend
npm install
npm run dev
```

Backend at `http://localhost:8000`
Frontend at `http://localhost:3000`
Ollama at `http://localhost:11434`

---

## Summary of All Changes to Make Right Now

| File | What to Do |
|---|---|
| `backend/app.py` | Add `load_dotenv()` as first two lines; add `ChatMessage`, `ChatRequest` models and `POST /ai/chat` route |
| `backend/.env` | Create this file with `GEMINI_API_KEY=your_key_here`; add to `.gitignore` |
| `backend/requirements.txt` | Add `python-dotenv`; remove `pymongo` and `google-genai` |

That is all. Three files. The entire Ollama pipeline, the RAG system, all feature engines, all existing routes — untouched.
