import "dotenv/config";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import type { VideoIdea } from "../types/db";

/**
 * Returns the next queued idea (status = pending, has scheduled_at).
 * Also checks if another idea is already processing to prevent parallelism.
 */
export async function fetchNextIdea(): Promise<VideoIdea | null> {
  // Concurrency guard: bail if anything is already processing
  const { count: inProgress } = await supabaseAdmin
    .from("video_ideas")
    .select("id", { count: "exact", head: true })
    .eq("status", "processing");

  if (inProgress && inProgress > 0) {
    console.log("[fetchNextIdea] Another idea is already processing. Exiting.");
    return null;
  }

  // Pick the earliest scheduled pending idea
  const { data, error } = await supabaseAdmin
    .from("video_ideas")
    .select("*")
    .eq("status", "pending")
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      console.log("[fetchNextIdea] No pending ideas found.");
      return null;
    }
    throw new Error(`fetchNextIdea DB error: ${error.message}`);
  }

  return data as VideoIdea;
}
