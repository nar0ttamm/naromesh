import "dotenv/config";
import { postReel } from "../lib/meta";
import { writeLog } from "./updateIdeaStatus";
import type { VideoIdea } from "../types/db";
import type { GeneratedMetadata } from "./generateMetadata";

export interface ScheduleResult {
  success: boolean;
  /** true if posted/scheduled on Instagram */
  posted: boolean;
  mediaId?: string;
  error?: string;
}

/**
 * Upload the final reel to Instagram via the Meta Graph API.
 *
 * The final video must be publicly accessible (Supabase public bucket URL).
 * If posting fails the error is recorded but the pipeline does NOT crash —
 * the caller updates status to "completed" instead of "posted".
 */
export async function scheduleInstagramPost(
  idea: VideoIdea,
  finalVideoUrl: string,
  metadata: GeneratedMetadata
): Promise<ScheduleResult> {
  const caption = [
    metadata.caption,
    "",
    metadata.hashtags.join(" ")
  ]
    .join("\n")
    .trim();

  await writeLog(idea.id, "instagram_post", "Attempting to post to Instagram…");

  const result = await postReel({
    videoUrl: finalVideoUrl,
    caption,
    scheduledAt: idea.scheduled_at
  });

  if (result.success) {
    await writeLog(
      idea.id,
      "instagram_post",
      `Posted successfully. Media ID: ${result.mediaId}`,
      "success"
    );
    return { success: true, posted: true, mediaId: result.mediaId };
  } else {
    await writeLog(
      idea.id,
      "instagram_post",
      `Post failed: ${result.error}`,
      "warn"
    );
    return { success: false, posted: false, error: result.error };
  }
}
