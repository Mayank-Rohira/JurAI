# JurAI — Full Engineering & Redesign Specification
**Version:** 2.0  
**Prepared for:** Antigravity  
**Project:** JurAI — Regulatory Intelligence & Compliance Lifecycle System  
**Stack:** Next.js 14 (App Router) · Python FastAPI · Gemini 2.0 Flash · DeepSeek Chat · ChromaDB  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current State Audit](#2-current-state-audit)
3. [Change 1 — Cloud LLM Migration (Gemini + DeepSeek)](#3-change-1--cloud-llm-migration-gemini--deepseek)
4. [Change 2 — Dynamic AI-Driven Questionnaire](#4-change-2--dynamic-ai-driven-questionnaire)
5. [Change 3 — Persistent Compliance Context](#5-change-3--persistent-compliance-context)
6. [Change 4 — Full App Redesign](#6-change-4--full-app-redesign)
7. [File-by-File Change Map](#7-file-by-file-change-map)
8. [New File Structure](#8-new-file-structure)
9. [Environment & Setup](#9-environment--setup)
10. [Design System](#10-design-system)
11. [Out of Scope](#11-out-of-scope)

---

## 1. Project Overview

JurAI is a compliance lifecycle tracking system that sits inside the software development process. It is NOT a legal chatbot. It records every compliance decision a product feature goes through — from idea to launch — so that if a legal issue arises post-launch, there is a complete, timestamped audit trail.

### The 5-Stage Lifecycle JurAI Tracks

| Stage | Who Does What |
|---|---|
| 1. Idea Formation | Engineer describes a proposed feature |
| 2. Initial Legal Review | JurAI generates a compliance report; legal team reviews |
| 3. Revision Tracking | Engineer modifies feature; JurAI records what changed and why |
| 4. Final Compliance Verification | Before launch, JurAI verifies implementation matches approved design |
| 5. Post-Launch Monitoring | If an issue arises, JurAI generates the full deviation timeline |

### Key Stakeholder Insights (from Interviews)

- **SDE-3:** Engineers and lawyers have a communication gap. Engineers need plain-English compliance feedback, not legal jargon. Internal "Law 0" policies (vendor bans, data residency rules) must be captured as early as Stage 1.
- **Litigator:** Does not want AI summaries. Wants a complete chronological timeline showing every action taken, by whom, and the exact moment things deviated from the approved compliance plan. This is the most valuable output for litigation support.

---

## 2. Current State Audit

### What Exists (and Works)

| Component | Location | Status |
|---|---|---|
| Multi-agent jury system (Jury + Critic + Judge) | `backend/agents/` | Working |
| RAG pipeline with ChromaDB | `backend/rag/` | Working |
| Core compliance pipeline | `backend/pipeline/core_pipeline.py` | Working |
| Risk reasoning engine | `backend/features/risk_reasoning/` | Working |
| Auto-fix suggestions | `backend/features/auto_fix/` | Working |
| Compliance diff engine | `backend/features/compliance_diff/` | Working |
| Compliance history (versioned file storage) | `backend/features/compliance_history/` | Working |
| SSE streaming endpoint | `backend/app.py /stream/pipeline` | Working |
| Human governance override | `backend/features/governance/` | Working |
| Static 14-question questionnaire | `frontend/app/questionnaire/page.tsx` | Replace |
| Analysis / verdict / fixes pages | `frontend/app/` | Redesign |
| LiteLLM wrapper pointing to Ollama | `backend/agents/core.py` | Reroute to cloud |

### What Is Broken or Missing

1. **No context persistence across stages.** Data entered in Stage 1 is saved only to `localStorage` under `pipeline_context` and is overwritten on every new run. There is no concept of a `feature_id` that carries data through Stages 2–5.

2. **Static questionnaire.** The current 14-question form asks every question regardless of context. A feature that doesn't use AI still gets asked AI-impact questions.

3. **Hardcoded local model names in agent config.** `backend/agents/config.py` references `ollama/mistral:7b-instruct` and `ollama/qwen3:4b`. These need to be replaced with cloud API calls.

4. **No stage navigation.** The app has no concept of which stage a feature is on. There is no dashboard showing a feature's compliance lifecycle progress.

5. **Frontend questionnaire calls Anthropic directly.** The incomplete questionnaire rewrite calls `https://api.anthropic.com/v1/messages` from the browser. This must be replaced with a Gemini call routed through the backend proxy.

6. **No Law 0 input.** The questionnaire does not ask about internal company policies. This was a key insight from the SDE-3 interview.

---

## 3. Change 1 — Cloud LLM Migration (Gemini + DeepSeek)

### Goal

Remove all Ollama and local model dependencies. Route all backend LLM calls through **Google Gemini 2.0 Flash** and **DeepSeek Chat** using their free public APIs. LiteLLM already supports both providers natively — the change is almost entirely in `config.py` and `.env`.

### Model Assignment

| Role | Model | Provider | Why |
|---|---|---|---|
| Jury Agent | `gemini/gemini-2.0-flash` | Google | Best free-tier reasoning; 1M token context window handles large legal docs |
| Critic Agent | `gemini/gemini-2.0-flash` | Google | Same model keeps critique style consistent with jury output |
| Judge Agent | `gemini/gemini-2.0-flash` | Google | Strong JSON instruction-following needed for structured verdict output |
| Risk Engine | `deepseek/deepseek-chat` | DeepSeek | Analytical, structured reasoning; generous free tier |
| Auto-Fix Engine | `deepseek/deepseek-chat` | DeepSeek | Step-by-step engineering output suits DeepSeek's reasoning style |
| Compliance Diff | `deepseek/deepseek-chat` | DeepSeek | Comparative JSON analysis between two verdict objects |
| Questionnaire intake | `gemini/gemini-2.0-flash` | Google | Conversational; called via backend proxy, never directly from browser |

**Why this split:** Gemini 2.0 Flash has a 1M token context window — critical for the Jury agent which must hold full legal documents from RAG plus feature description plus conversation history simultaneously. DeepSeek produces cleaner structured step-by-step lists which suits the feature engines that output JSON arrays of engineering actions.

### Free Tier Limits

| Provider | Free Limit | Notes |
|---|---|---|
| Google Gemini | 15 requests/minute, 1M tokens/day | Get key at aistudio.google.com |
| DeepSeek | ~100 requests/day on free tier | Get key at platform.deepseek.com |

A full compliance run costs roughly 6–9 API calls total (3–6 for agents, 3 for features). Well within free tier for development.

### Backend Changes

#### `backend/agents/config.py` — Full Replacement

Replace the entire file with:

```python
import os
from .core import LiteLlm, Agent
from .prompts import jury_prompt, jury_report_critic_prompt, jury_final_response_prompt
from .tools import naiverag_retrieve_tool

# API Keys (loaded from .env by load_dotenv() in app.py)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Gemini 2.0 Flash — all three agents
gemini_model = LiteLlm(
    model="gemini/gemini-2.0-flash",
    api_key=GEMINI_API_KEY
)

# DeepSeek Chat — feature engines (risk, fix, diff)
deepseek_model = LiteLlm(
    model="deepseek/deepseek-chat",
    api_key=DEEPSEEK_API_KEY
)

# Aliases — keep these names so existing imports in feature engines don't break
llama_model = gemini_model       # used by jury agent
mistral_model = gemini_model     # used by critic + judge agents
standard_model = deepseek_model  # used by risk, fix, diff engines

# Agent factories
def create_jury_agent(name, model=gemini_model):
    return Agent(
        name=name,
        instruction=jury_prompt.PROMPT,
        model=model,
        tools=[naiverag_retrieve_tool]
    )

def create_critic_agent(name, model=gemini_model):
    return Agent(
        name=name,
        instruction=jury_report_critic_prompt.PROMPT,
        model=model
    )

def create_judge_agent(name="Judge", model=gemini_model):
    return Agent(
        name=name,
        instruction=jury_final_response_prompt.PROMPT,
        model=model
    )
```

#### `backend/app.py` — Two Additions

**Addition 1:** At the very top of the file, before any other imports:

```python
from dotenv import load_dotenv
load_dotenv()
```

**Addition 2:** New proxy route for the questionnaire (add alongside other routes):

```python
class ChatRequest(BaseModel):
    messages: list
    system_prompt: str

@app.post("/ai/chat")
async def ai_chat(request: ChatRequest):
    """
    Proxy route for the dynamic questionnaire.
    Calls Gemini on behalf of the frontend so the API key stays server-side.
    Never expose GEMINI_API_KEY to the browser.
    """
    import litellm
    full_messages = [{"role": "system", "content": request.system_prompt}] + request.messages
    response = litellm.completion(
        model="gemini/gemini-2.0-flash",
        messages=full_messages,
        api_key=os.getenv("GEMINI_API_KEY"),
        max_tokens=400
    )
    return {"content": response.choices[0].message.content}
```

#### `backend/.env` — Create This File

```env
# Google Gemini — free key at aistudio.google.com
GEMINI_API_KEY=your_gemini_key_here

# DeepSeek — free key at platform.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_key_here
```

Add `.env` to `.gitignore` immediately. Never commit API keys.

#### Feature Engines — No Changes Required

`risk_engine.py`, `fix_engine.py`, and `diff_engine.py` all import model aliases from `config.py`:

- `risk_engine.py`: `from agents.config import mistral_model` → alias now points to `gemini_model`
- `fix_engine.py`: `from agents.config import standard_model` → alias now points to `deepseek_model`
- `diff_engine.py`: `from agents.config import mistral_model` → alias now points to `gemini_model`

Updating `config.py` alone is sufficient. No edits needed in any feature engine file.

### Frontend Changes

#### `frontend/app/questionnaire/page.tsx` — API Call

The questionnaire calls the backend proxy instead of any external AI service directly:

```typescript
// REMOVE entirely — never call external AI APIs from the browser
// fetch("https://api.anthropic.com/v1/messages", ...)

// REPLACE WITH — backend proxy keeps the API key server-side
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: conversationHistory,       // Message[] array
    system_prompt: buildSystemPrompt(collectedTurns)
  })
});
const data = await response.json();
const aiReply: string = data.content;
```

#### `frontend/.env.local` — Create This File

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

No AI API keys go in the frontend environment. The backend handles all LLM calls.

---

## 4. Change 2 — Dynamic AI-Driven Questionnaire

### Goal

Replace the static 14-question form with a conversational AI intake that asks one question at a time, where each question is informed by the previous answer. The AI (Gemini via the `/ai/chat` proxy) decides when enough information has been collected (6–10 questions, never more than 12).

### How It Works

1. User lands on `/questionnaire`
2. JurAI asks the first question: "What is the name of this feature?"
3. User types an answer and presses Enter or clicks Send
4. The answer + full conversation history is sent to `POST /ai/chat` on the backend
5. Gemini responds with the next question, or the done signal
6. This continues until the AI outputs: `{"done": true, "summary": "..."}`
7. The frontend detects this JSON, ends the conversation, shows a summary card + Submit button

### Information JurAI Must Collect

| # | Field Key | What to Collect |
|---|---|---|
| 1 | `feature_name` | What is the feature called? |
| 2 | `feature_description` | What does it do? Who uses it? |
| 3 | `jurisdictions` | Which countries/regions will it be available in? |
| 4 | `data_collected` | What personal data does it collect or process? |
| 5 | `data_storage` | How long is data stored and where? |
| 6 | `user_consent` | Do users explicitly consent? Can they opt out? |
| 7 | `uses_ai` | Does it use AI or automated decision-making? |
| 8 | `ai_impact` | If AI: can it significantly affect users? |
| 9 | `law0_policies` | Any internal company rules (vendor bans, data residency)? |
| 10 | `legal_concerns` | Any known legal, privacy, or ethical concerns? |

### System Prompt

```
You are JurAI's intake agent. Your job is to learn about a software product feature
so a compliance analysis can be performed.

You ask ONE short question at a time. Never ask multiple questions in a single message.
Each question must build naturally on the previous answer.

INFORMATION TO COLLECT (adapt order to the conversation):
- feature_name, feature_description, jurisdictions, data_collected, data_storage,
  user_consent, uses_ai, ai_impact, law0_policies, legal_concerns

RULES:
- Keep questions short (1-2 sentences max).
- Ask one focused follow-up if an answer is vague, then move on.
- Once all 10 topics are covered, output ONLY this JSON and nothing else:
  {"done": true, "summary": "<2-3 sentence plain English summary>"}
- Never ask more than 12 questions total.
- Never repeat a question already answered.
- Professional but approachable. No legal jargon.

ALREADY COLLECTED:
{dynamically injected list of field_key: "answer" pairs after each turn}
```

### UI Design

The page must feel like a chat with a compliance advisor, not a form.

- Full-screen, distraction-free (no main nav bar)
- Minimal header: JurAI logo left + "Question X of ~10" right
- Scrollable message thread, centered, max-width 720px
- AI messages: left-aligned bubble, card background, scale icon avatar
- User messages: right-aligned bubble, teal background, white text
- Input bar: fixed to bottom, Enter to submit, Shift+Enter for newlines
- Loading: animated three-dot typing indicator in the AI bubble position
- Autofocus input after every AI response
- When done: input hides, summary card + "Submit for Legal Review" button appear

---

## 5. Change 3 — Persistent Compliance Context

### Goal

Information entered at Stage 1 must survive to every subsequent stage. A `feature_id` is the persistent key connecting all stages. Replace the current single-slot `localStorage["pipeline_context"]` with a multi-feature store.

### Storage Structure

`localStorage["jurai_features"]` holds a dictionary keyed by `feature_id`:

```typescript
type FeatureContext = {
  feature_id: string
  feature_name: string
  created_at: string
  updated_at: string
  current_stage: 1 | 2 | 3 | 4 | 5

  intake: {
    conversation: { role: string; content: string }[]
    collected: Record<string, string>  // field_key → answer
    summary: string
    completed_at: string
  }

  legal_review?: {
    run_id: string
    verdict: object
    risk_assessment: object
    submitted_at: string
    approved: boolean
    lawyer_notes?: string
  }

  revisions?: {
    version: number
    changes_description: string
    run_id: string
    submitted_at: string
    approved: boolean
  }[]

  final_verification?: {
    run_id: string
    verdict: object
    passed: boolean
    verified_at: string
  }

  post_launch?: {
    launched_at: string
    incidents: { description: string; reported_at: string }[]
  }
}
```

### Create: `frontend/lib/context.ts`

Single source of truth for all localStorage reads/writes. Every page imports from here:

```typescript
export function getAllFeatures(): Record<string, FeatureContext>
export function getFeature(featureId: string): FeatureContext | null
export function saveFeature(featureId: string, data: Partial<FeatureContext>): void
export function createFeature(name: string): FeatureContext
export function updateStage(featureId: string, stage: number): void
```

### Context Flow Through Pages

| Page | Reads | Writes |
|---|---|---|
| `/questionnaire` | Nothing — creates new feature | Creates feature, saves intake data |
| `/analysis` | `intake.collected` → sends to backend | Saves `run_id` to `legal_review` |
| `/verdict` | `feature_id`, `run_id` from URL | Saves verdict + risk to `legal_review` |
| `/fixes` | `feature_id`, `run_id` from URL | Saves auto-fix data |
| `/dashboard` | All features | Read-only |
| `/timeline` | Full feature history | Read-only |

### URL Strategy

```
/questionnaire                           → creates new feature_id
/analysis?feature_id=feat_123           → reads context from localStorage
/verdict?feature_id=feat_123&run_id=abc → fetches from backend
/fixes?feature_id=feat_123&run_id=abc  → fetches from backend
/timeline?feature_id=feat_123          → reads history from backend storage
```

---

## 6. Change 4 — Full App Redesign

Keep existing colors, fonts, and component patterns. Redesign information architecture around the 5-stage lifecycle model.

### 6.1 Dashboard (`/dashboard`) — Full Rewrite

- Header: JurAI logo + "New Feature Assessment" button (teal, top right)
- Feature cards grid: 2-column desktop, 1-column mobile
- Each card: feature name, current stage pill, compliance status badge, last updated, 5-dot progress indicator, "Continue" button
- Empty state: illustration + "Start your first compliance assessment" CTA

### 6.2 Questionnaire (`/questionnaire`) — Full Rewrite

AI chat interface as described in Section 4. No static questions. No JSON upload.

### 6.3 Analysis (`/analysis`) — Redesign

Keep all SSE streaming logic. Redesign visuals:

- Full-screen dark background during analysis
- Three agent cards horizontal on desktop, stacked on mobile
- Animated pulse ring while agent is active, "Done" checkmark on completion
- Real-time log feed below cards (existing thought streaming preserved)
- Progress label: "Analysing · Stage 2 of 5"
- Auto-redirect to `/verdict` on `done` SSE event

### 6.4 Verdict (`/verdict`) — Redesign

- Top summary bar: feature name, stage, verdict label, confidence, risk score
- Issues section: severity-sorted, expandable cards with fix guidance
- Legal Evidence section: regulation cards with jurisdiction flags
- Risk Assessment: risk gauge, jurisdiction exposure, penalty range
- Footer: Back to Dashboard / View Auto-Fix Recommendations

### 6.5 Fixes (`/fixes`) — Redesign

- Issue cards with "Mark as Implemented" checkbox (saved to context)
- Progress tracker: "X of Y issues addressed"
- CTA: "Submit Revised Design for Legal Review" when all issues addressed

### 6.6 Timeline (`/timeline`) — NEW PAGE

The output the litigator specifically asked for. Does not currently exist.

**URL:** `/timeline?feature_id=feat_123`

Vertical timeline, newest events at top. Each event card shows: timestamp, stage, actor (Engineer / JurAI / Legal Team / System), event type, description.

**Deviation highlighting:** The exact event where implementation diverged from the approved design is highlighted in red with a prominent warning banner. This is the most important element on the page.

**Export button:** "Export Full Timeline as PDF" for regulatory investigations.

### 6.7 Home Page (`/`) — Light Redesign

- Updated value proposition: "Track compliance across your entire development lifecycle — not just at launch"
- Three highlights: AI Intake · Lifecycle Tracking · Litigation-Ready Timeline
- Primary CTA: "Start New Assessment"
- Secondary CTA: "View Dashboard" — shown only if localStorage has existing features

### Navigation

Persistent top nav on all pages except `/questionnaire`:
- JurAI logo (home link)
- Dashboard
- Theme toggle

On `/questionnaire`: minimal header only (logo + progress indicator).

---

## 7. File-by-File Change Map

### Backend

| File | Change Type | What to Change |
|---|---|---|
| `backend/agents/config.py` | Full rewrite | Gemini + DeepSeek models via LiteLLM; keep alias names |
| `backend/app.py` | Add two things | `load_dotenv()` at top; `POST /ai/chat` proxy route |
| `backend/.env` | Create | `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` |
| `backend/features/risk_reasoning/risk_engine.py` | No change | Picks up DeepSeek via `mistral_model` alias automatically |
| `backend/features/auto_fix/fix_engine.py` | No change | Picks up DeepSeek via `standard_model` alias automatically |
| `backend/features/compliance_diff/diff_engine.py` | No change | Picks up DeepSeek via `mistral_model` alias automatically |
| `backend/pipeline/core_pipeline.py` | No change | Orchestration only, no model references |

### Frontend

| File | Change Type | What to Change |
|---|---|---|
| `frontend/lib/context.ts` | Create | Full context persistence utility (Section 5) |
| `frontend/lib/api.ts` | Modify | Add `aiChat()` function pointing to `/ai/chat` |
| `frontend/app/questionnaire/page.tsx` | Full rewrite | AI chat calling `/ai/chat` backend proxy |
| `frontend/app/dashboard/page.tsx` | Full rewrite | Feature lifecycle dashboard (Section 6.1) |
| `frontend/app/analysis/page.tsx` | Redesign | Keep SSE, redesign agent cards (Section 6.3) |
| `frontend/app/verdict/page.tsx` | Redesign | Stage-aware layout, improved issue cards (Section 6.4) |
| `frontend/app/fixes/page.tsx` | Redesign | Implementation tracking, stage-aware CTA (Section 6.5) |
| `frontend/app/timeline/page.tsx` | Create | Full compliance timeline (Section 6.6) |
| `frontend/app/page.tsx` | Light redesign | Updated copy + dashboard CTA (Section 6.7) |
| `frontend/.env.local` | Create | `NEXT_PUBLIC_API_URL` only — no AI keys |
| `frontend/tailwind.config.ts` | No change | Design tokens are already correct |

---

## 8. New File Structure

```
JurAI-master/
├── backend/
│   ├── .env                              NEW — API keys (never commit)
│   ├── .gitignore                        Ensure .env is listed here
│   ├── app.py                            ADD load_dotenv() + /ai/chat route
│   ├── agents/
│   │   ├── config.py                     FULL REWRITE — Gemini + DeepSeek
│   │   ├── core.py                       No change
│   │   ├── jury_system.py                No change
│   │   ├── prompts/                      No change
│   │   └── tools.py                      No change
│   ├── features/
│   │   ├── auto_fix/                     No change
│   │   ├── compliance_diff/              No change
│   │   ├── compliance_history/           No change
│   │   ├── governance/                   No change
│   │   └── risk_reasoning/               No change
│   ├── pipeline/                         No change
│   └── rag/                              No change
│
└── frontend/
    ├── .env.local                        NEW — NEXT_PUBLIC_API_URL only
    ├── app/
    │   ├── page.tsx                      LIGHT REDESIGN
    │   ├── dashboard/page.tsx            FULL REWRITE
    │   ├── questionnaire/page.tsx        FULL REWRITE
    │   ├── analysis/page.tsx             REDESIGN
    │   ├── verdict/page.tsx              REDESIGN
    │   ├── fixes/page.tsx                REDESIGN
    │   └── timeline/page.tsx             NEW
    ├── lib/
    │   ├── api.ts                        MODIFIED
    │   ├── context.ts                    NEW
    │   └── utils.ts                      No change
    └── components/                       No change
```

---

## 9. Environment & Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Free Google AI Studio account → aistudio.google.com
- Free DeepSeek account → platform.deepseek.com

### Getting API Keys

**Gemini:**
1. Go to `aistudio.google.com`
2. Sign in with Google account
3. Click "Get API Key" → "Create API key"
4. Key starts with `AIza...`
5. Free tier: 15 requests/min, 1M tokens/day

**DeepSeek:**
1. Go to `platform.deepseek.com`
2. Create free account
3. API Keys → Create new key
4. Key starts with `sk-...`

### Setup Commands

```bash
# 1. Install backend dependencies
cd backend
pip install fastapi uvicorn litellm sse-starlette chromadb \
            langchain langchain-chroma langchain-huggingface \
            python-dotenv

# 2. Create backend .env
cat > .env << EOF
GEMINI_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
EOF

# 3. Add .env to .gitignore
echo ".env" >> .gitignore

# 4. Frontend dependencies
cd ../frontend
npm install

# 5. Create frontend .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### Running the App

Two terminals only — no Ollama, no local model:

```bash
# Terminal 1 — Backend
cd backend
uvicorn app:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

App: `http://localhost:3000`

### Verifying Setup

```bash
# Backend is alive
curl http://localhost:8000/results/test/test
# Expected: 404 "Result not found"

# Gemini connection works
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "say hello"}], "system_prompt": "You are helpful."}'
# Expected: {"content": "Hello! ..."}
```

---

## 10. Design System

Existing tokens must not change.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `parchment` | `#FDFCFB` | Light mode background, dark mode text |
| `charcoal` | `#2D2D2D` | Dark mode background, light mode text |
| `teal` | `#0D5C63` | Primary brand color, CTAs, active states |
| `slate` | `#4A5568` | Secondary text, labels |
| `gold` | `#C5A059` | Accents, step indicators, highlights |

### Fonts

| Role | Font |
|---|---|
| Serif | Playfair Display |
| Sans | Inter |
| Mono | System monospace |

### New — Severity Colors

| Severity | Tailwind |
|---|---|
| CRITICAL | `bg-red-600 text-white` |
| HIGH | `bg-red-500 text-white` |
| MEDIUM | `bg-amber-500 text-white` |
| LOW | `bg-green-600 text-white` |

### New — Stage Status Colors

| Status | Tailwind |
|---|---|
| Not started | `bg-charcoal/10 text-slate` |
| In progress | `bg-gold/20 text-gold` |
| Approved | `bg-teal/20 text-teal` |
| Issues found | `bg-red-500/20 text-red-600` |

### Component Patterns

- Rounded corners: `rounded-sm`
- Border: `border border-charcoal/10 dark:border-white/10`
- Card: `bg-white dark:bg-[#151515]`
- Page: `bg-parchment dark:bg-[#0A0A0A]`
- Animations: Framer Motion, `ease: "circOut"`, `duration: 0.4`
- Hover: `hover:border-teal/50 hover:bg-teal/5`

---

## 11. Out of Scope

- Authentication system — mock auth is sufficient
- Database migration — `temp_data.json` is the intended storage
- Multi-user support — single-user tool
- PDF export for timeline — show the button, defer implementation
- `/results` page — leave as-is with sample data
- Stages 3, 4, 5 full implementation — show "Coming Soon" on dashboard
- Rate limit handling — free tier is sufficient for development

---

*End of specification — Version 2.0*
