import "dotenv/config";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import type { IdeaStatus } from "../types/db";

/**
 * Update idea status and optionally other fields.
 * Also writes a log entry for the status change.
 */
export async function updateIdeaStatus(
  ideaId: string,
  status: IdeaStatus,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("video_ideas")
    .update({ status, ...extra })
    .eq("id", ideaId);

  if (error) {
    throw new Error(`Failed to update idea status: ${error.message}`);
  }
}

/**
 * Write a log row for this idea.
 */
export async function writeLog(
  ideaId: string,
  step: string,
  message: string,
  level: "info" | "warn" | "error" | "success" = "info"
): Promise<void> {
  const { error } = await supabaseAdmin.from("pipeline_logs").insert({
    idea_id: ideaId,
    step,
    message,
    level
  });

  if (error) {
    // Don't throw — logging failures should never abort the pipeline
    console.error("[log] Failed to write log:", error.message);
  }
}
