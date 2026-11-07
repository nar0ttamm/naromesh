// ============================================================
// Database types — mirror the Supabase schema exactly.
// Use these everywhere instead of inline object types.
// ============================================================

export type IdeaStatus =
  | "pending"
  | "processing"
  | "clips_generated"
  | "merged"
  | "completed"
  | "scheduled"
  | "posted"
  | "failed";

export type LogLevel = "info" | "warn" | "error" | "success";

// --------------- scene_breakdown element -------------------

export interface SceneItem {
  scene_number: number;
  visual_prompt: string;
  motion_prompt: string;
  duration_seconds: number;
}

// --------------- video_ideas --------------------------------

export interface VideoIdea {
  id: string;
  title: string;
  full_script: string;
  scene_breakdown: SceneItem[];
  scheduled_at: string; // ISO-8601 string from Postgres
  status: IdeaStatus;
  final_video_url: string | null;
  caption: string | null;
  hashtags: string[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// --------------- pipeline_logs ------------------------------

export interface PipelineLog {
  id: string;
  idea_id: string;
  step: string;
  message: string;
  level: LogLevel;
  created_at: string;
}

// --------------- model_profile ------------------------------

export interface ModelProfile {
  id: string;
  name: string;
  base_prompt: string;
  negative_prompt: string | null;
  reference_image_url: string | null;
  style_notes: string | null;
  is_default: boolean;
  created_at: string;
}

// --------------- API payload shapes --------------------------

export interface CreateIdeaPayload {
  title: string;
  full_script: string;
  scene_breakdown: SceneItem[];
  scheduled_at: string;
}

export interface UpdateIdeaPayload {
  title?: string;
  full_script?: string;
  scene_breakdown?: SceneItem[];
  scheduled_at?: string;
  status?: IdeaStatus;
  final_video_url?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  error_message?: string | null;
}

export interface DashboardStats {
  pending: number;
  processing: number;
  completed: number;
  scheduled: number;
  posted: number;
  failed: number;
}
