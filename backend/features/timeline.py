# features/timeline.py
# Generates the compliance timeline for a feature.
# This is the litigation-support output — a complete chronological record
# of every compliance decision made during the feature's development lifecycle.
# The deviation point (where implementation diverged from approved design) is
# the single most important element and must always be highlighted.

import os
import json
from datetime import datetime
from typing import Optional
from features.context_store import get_feature_context
from features.compliance_history.history_manager import list_verdict_history

def build_timeline(feature_id: str) -> dict:
    """
    Constructs the full compliance timeline for a feature by combining:
    - The feature context (stage history, intake, legal review, revisions)
    - The versioned verdict history from compliance_history/
    Returns a structured timeline with all events in chronological order
    and deviation detection.
    """
    context = get_feature_context(feature_id)
    verdict_history = list_verdict_history(feature_id)

    if not context and not verdict_history:
        return None

    events = []

    # Stage 1 — Idea Formation
    if context and context.get("intake"):
        intake = context["intake"]
        events.append({
            "event_id": f"{feature_id}_intake",
            "timestamp": intake.get("completed_at"),
            "stage": 1,
            "stage_name": "Idea Formation",
            "actor": "Engineer",
            "event_type": "Feature Proposed",
            "description": f"Engineer completed intake questionnaire. Summary: {intake.get('summary', 'No summary available.')}",
            "data": intake.get("collected", {}),
            "deviation": False
        })

    # Verdict history — one event per compliance run
    for record in verdict_history:
        verdict = record.get("verdict", {})
        version = record.get("version", "?")
        timestamp = record.get("timestamp")
        issues = verdict.get("issues", [])
        critical_count = sum(1 for i in issues if i.get("severity") in ["Critical", "High"])

        events.append({
            "event_id": f"{feature_id}_verdict_{version}",
            "timestamp": timestamp,
            "stage": 2 if version == "001" else 3,
            "stage_name": "Initial Legal Review" if version == "001" else "Revision Review",
            "actor": "JurAI",
            "event_type": "Compliance Analysis Run",
            "description": f"Compliance analysis version {version} completed. {len(issues)} issues found, {critical_count} critical/high severity.",
            "data": {
                "version": version,
                "risk_score": verdict.get("risk_score"),
                "compliance_score": verdict.get("compliance_score"),
                "issue_count": len(issues),
                "critical_count": critical_count,
                "summary": verdict.get("summary", "")
            },
            "deviation": False
        })

    # Legal review approval/rejection from context
    if context and context.get("legal_review"):
        lr = context["legal_review"]
        approved = lr.get("approved", False)
        events.append({
            "event_id": f"{feature_id}_legal_review",
            "timestamp": lr.get("submitted_at"),
            "stage": 2,
            "stage_name": "Initial Legal Review",
            "actor": "Legal Team",
            "event_type": "Legal Review Submitted" if not approved else "Legal Review Approved",
            "description": lr.get("lawyer_notes") or ("Legal review approved." if approved else "Legal review pending approval."),
            "data": {"approved": approved, "run_id": lr.get("run_id")},
            "deviation": False
        })

    # Revisions from context
    if context and context.get("revisions"):
        for rev in context["revisions"]:
            events.append({
                "event_id": f"{feature_id}_revision_{rev.get('version')}",
                "timestamp": rev.get("submitted_at"),
                "stage": 3,
                "stage_name": "Revision Tracking",
                "actor": "Engineer",
                "event_type": "Changes Submitted",
                "description": rev.get("changes_description", "Engineer submitted revised design."),
                "data": {"version": rev.get("version"), "run_id": rev.get("run_id"), "approved": rev.get("approved")},
                "deviation": False
            })

    # Sort all events chronologically
    events.sort(key=lambda e: e.get("timestamp") or "")

    # Deviation detection
    # A deviation occurs when a revision run produces MORE critical/high issues
    # than the previously approved run — meaning the engineer introduced new problems.
    deviation_point = None
    approved_issue_count = None

    for i, event in enumerate(events):
        if event["event_type"] == "Legal Review Approved":
            # Find the verdict run just before this approval
            for prev in reversed(events[:i]):
                if prev["event_type"] == "Compliance Analysis Run":
                    approved_issue_count = prev["data"].get("critical_count", 0)
                    break
        elif event["event_type"] == "Compliance Analysis Run" and approved_issue_count is not None:
            current_critical = event["data"].get("critical_count", 0)
            if current_critical > approved_issue_count:
                event["deviation"] = True
                deviation_point = event["event_id"]

    return {
        "feature_id": feature_id,
        "feature_name": context.get("feature_name") if context else feature_id,
        "generated_at": datetime.utcnow().isoformat(),
        "current_stage": context.get("current_stage") if context else None,
        "total_events": len(events),
        "deviation_detected": deviation_point is not None,
        "deviation_point_event_id": deviation_point,
        "events": events
    }
