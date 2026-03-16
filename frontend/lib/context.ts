export type FeatureStage = 1 | 2 | 3 | 4 | 5;

export interface FeatureContext {
  feature_id: string;
  feature_name: string;
  created_at: string;
  updated_at: string;
  current_stage: FeatureStage;

  intake: {
    conversation: { role: string; content: string }[];
    collected: Record<string, string>; // field_key → answer
    summary: string;
    completed_at?: string;
  };

  timeline: {
    event_id: string;
    type: 'interaction' | 'system' | 'decision';
    timestamp: string;
    content: string;
    role?: string;
    metadata?: Record<string, any>;
    is_deviation?: boolean;
    deviation_notes?: string;
  }[];

  legal_review?: {
    run_id: string;
    verdict: any;
    risk_assessment: any;
    submitted_at: string;
    approved: boolean;
    lawyer_notes?: string;
  };

  revisions?: {
    version: number;
    changes_description: string;
    run_id: string;
    submitted_at: string;
    approved: boolean;
  }[];

  final_verification?: {
    run_id: string;
    verdict: any;
    passed: boolean;
    verified_at: string;
  };

  post_launch?: {
    launched_at: string;
    incidents: { description: string; reported_at: string }[];
  };
}

const STORAGE_KEY = "jurai_features";

export function getAllFeatures(): Record<string, FeatureContext> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse jurai_features", e);
    return {};
  }
}

export function getFeature(featureId: string): FeatureContext | null {
  const features = getAllFeatures();
  return features[featureId] || null;
}

export function saveFeature(featureId: string, data: Partial<FeatureContext>): void {
  if (typeof window === "undefined") return;
  const features = getAllFeatures();
  const existing = features[featureId] || {
    feature_id: featureId,
    feature_name: "Untitled Feature",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_stage: 1,
    intake: {
      conversation: [],
      collected: {},
      summary: "",
    },
    timeline: [],
  };

  features[featureId] = {
    ...existing,
    ...data,
    updated_at: new Date().toISOString(),
    // Deep merge intake if provided
    intake: {
      ...existing.intake,
      ...(data.intake || {}),
    },
    timeline: data.timeline || existing.timeline || [],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
}

export function createFeature(name: string): FeatureContext {
  const featureId = `feat_${Math.random().toString(36).substring(2, 10)}`;
  const newFeature: FeatureContext = {
    feature_id: featureId,
    feature_name: name || "Untitled Feature",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_stage: 1,
    intake: {
      conversation: [],
      collected: {},
      summary: "",
    },
    timeline: [],
  };

  saveFeature(featureId, newFeature);
  return newFeature;
}

export function updateStage(featureId: string, stage: FeatureStage): void {
  saveFeature(featureId, { current_stage: stage });
}
