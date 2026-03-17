# features/context_store.py
# Persistent feature context store.
# Stores the full lifecycle record of every feature that passes through JurAI.
# This is separate from temp_data.json (which stores individual pipeline runs)
# and separate from compliance_history/ (which stores immutable verdicts).
# This is the high-level lifecycle record: intake → legal review → revisions → verification → post-launch.

import os
import json
from datetime import datetime
from typing import Optional, Dict, Any

CONTEXT_DIR = "storage/feature_contexts"

def _ensure_dir():
    os.makedirs(CONTEXT_DIR, exist_ok=True)

def _context_path(feature_id: str) -> str:
    return os.path.join(CONTEXT_DIR, f"{feature_id}.json")

def create_feature_context(
    feature_id: str,
    feature_name: str,
    intake_conversation: list,
    intake_collected: dict,
    intake_summary: str
) -> dict:
    """
    Creates a new feature context record at the end of Stage 1 (questionnaire).
    Called once when the engineer completes the intake chat.
    """
    _ensure_dir()
    now = datetime.utcnow().isoformat()
    context = {
        "feature_id": feature_id,
        "feature_name": feature_name,
        "created_at": now,
        "updated_at": now,
        "current_stage": 1,
        "stage_history": [
            {
                "stage": 1,
                "name": "Idea Formation",
                "entered_at": now,
                "status": "completed"
            }
        ],
        "intake": {
            "conversation": intake_conversation,
            "collected": intake_collected,
            "summary": intake_summary,
            "completed_at": now
        },
        "legal_review": None,
        "revisions": [],
        "final_verification": None,
        "post_launch": None
    }
    with open(_context_path(feature_id), "w") as f:
        json.dump(context, f, indent=2)
    return context

def get_feature_context(feature_id: str) -> Optional[dict]:
    """Returns the full context record for a feature, or None if not found."""
    path = _context_path(feature_id)
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)

def update_feature_context(feature_id: str, updates: dict) -> Optional[dict]:
    """Merges updates into an existing feature context and saves it."""
    context = get_feature_context(feature_id)
    if not context:
        return None
    context.update(updates)
    context["updated_at"] = datetime.utcnow().isoformat()
    with open(_context_path(feature_id), "w") as f:
        json.dump(context, f, indent=2)
    return context

def advance_stage(feature_id: str, new_stage: int, stage_name: str) -> Optional[dict]:
    """Advances the feature to the next lifecycle stage and logs the transition."""
    context = get_feature_context(feature_id)
    if not context:
        return None
    now = datetime.utcnow().isoformat()
    context["current_stage"] = new_stage
    context["updated_at"] = now
    context["stage_history"].append({
        "stage": new_stage,
        "name": stage_name,
        "entered_at": now,
        "status": "in_progress"
    })
    with open(_context_path(feature_id), "w") as f:
        json.dump(context, f, indent=2)
    return context

def save_legal_review(feature_id: str, run_id: str, verdict: dict, risk_assessment: dict) -> Optional[dict]:
    """Saves Stage 2 legal review results into the feature context."""
    return update_feature_context(feature_id, {
        "current_stage": 2,
        "legal_review": {
            "run_id": run_id,
            "verdict": verdict,
            "risk_assessment": risk_assessment,
            "submitted_at": datetime.utcnow().isoformat(),
            "approved": False,
            "lawyer_notes": None
        }
    })

def add_revision(feature_id: str, run_id: str, changes_description: str) -> Optional[dict]:
    """Appends a Stage 3 revision record to the feature context."""
    context = get_feature_context(feature_id)
    if not context:
        return None
    revision = {
        "version": len(context.get("revisions", [])) + 1,
        "run_id": run_id,
        "changes_description": changes_description,
        "submitted_at": datetime.utcnow().isoformat(),
        "approved": False
    }
    context.setdefault("revisions", []).append(revision)
    context["updated_at"] = datetime.utcnow().isoformat()
    context["current_stage"] = 3
    with open(_context_path(feature_id), "w") as f:
        json.dump(context, f, indent=2)
    return context

def list_all_features() -> list:
    """Returns a summary list of all features in the context store."""
    _ensure_dir()
    features = []
    for filename in os.listdir(CONTEXT_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(CONTEXT_DIR, filename), "r") as f:
                try:
                    ctx = json.load(f)
                    features.append({
                        "feature_id": ctx.get("feature_id"),
                        "feature_name": ctx.get("feature_name"),
                        "current_stage": ctx.get("current_stage"),
                        "created_at": ctx.get("created_at"),
                        "updated_at": ctx.get("updated_at")
                    })
                except:
                    pass
    return sorted(features, key=lambda x: x.get("updated_at", ""), reverse=True)
