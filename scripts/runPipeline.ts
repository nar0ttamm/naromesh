/**
 * Main pipeline entry point.
 *
 * Run with:   npm run pipeline
 * Or triggered by GitHub Actions on schedule.
 *
 * Flow:
 *  1. Fetch next pending idea (concurrency-safe)
 *  2. Update status → processing
 *  3. Load default model profile
 *  4. Generate clips (fal.ai Pika)
 *  5. Upload clips to Supabase
 *  6. Merge clips with FFmpeg
 *  7. Upload final video to Supabase
 *  8. Generate caption + hashtags
 *  9. Post to Instagram (graceful fallback)
 * 10. Update final status
 */

import "dotenv/config";
import { fetchNextIdea } from "./fetchNextIdea";
import { generateClips } from "./generateClips";
import { mergeAndUpload } from "./mergeClips";
import { generateMetadata } from "./generateMetadata";
import { scheduleInstagramPost } from "./scheduleInstagramPost";
import { updateIdeaStatus, writeLog } from "./updateIdeaStatus";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { checkFfmpegAvailable } from "../lib/ffmpeg";
import { isMockMode } from "../lib/utils";
import type { ModelProfile } from "../types/db";

export interface PipelineResult {
  ran: boolean;
  ideaId?: string;
  message: string;
  status?: string;
}

export async function runPipeline(): Promise<PipelineResult> {
  console.log("=== Naromesh pipeline start ===");

  if (isMockMode()) {
    console.log("[pipeline] MOCK_MODE is enabled — no real API calls will be made.");
  }

  // Sanity check: ffmpeg must be available
  if (!isMockMode()) {
    try {
      const version = checkFfmpegAvailable();
      console.log("[pipeline] FFmpeg:", version);
    } catch (err) {
      console.error("[pipeline] ffmpeg check failed:", (err as Error).message);
      return { ran: false, message: (err as Error).message };
    }
  }

  // 1. Fetch next idea
  const idea = await fetchNextIdea();

  if (!idea) {
    console.log("[pipeline] Nothing to process. Exiting.");
    return { ran: false, message: "No pending ideas found." };
  }

  console.log(`[pipeline] Processing idea: "${idea.title}" (${idea.id})`);

  // 2. Mark as processing
  await updateIdeaStatus(idea.id, "processing");
  await writeLog(idea.id, "pipeline_start", `Pipeline started for "${idea.title}"`);

  try {
    // 3. Load default model profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("model_profile")
      .select("*")
      .eq("is_default", true)
      .single();

    if (profileError || !profileData) {
      throw new Error("No default model profile found. Run the SQL migration.");
    }

    const model = profileData as ModelProfile;
    await writeLog(idea.id, "load_model", `Using model profile: ${model.name}`);

    // 4. Generate clips
    await writeLog(
      idea.id,
      "generate_clips",
      `Generating ${idea.scene_breakdown.length} clips…`
    );
    const clips = await generateClips(idea, model);
    await updateIdeaStatus(idea.id, "clips_generated");
    await writeLog(
      idea.id,
      "generate_clips",
      `${clips.length} clips generated.`,
      "success"
    );

    // 5+6. Merge clips and upload final video
    await writeLog(idea.id, "merge", "Merging clips with FFmpeg…");
    const finalVideoUrl = await mergeAndUpload(idea, clips);

    await updateIdeaStatus(idea.id, "merged", {
      final_video_url: finalVideoUrl
    });
    await writeLog(
      idea.id,
      "merge",
      `Final video ready: ${finalVideoUrl}`,
      "success"
    );

    // 7. Generate caption & hashtags
    const metadata = await generateMetadata(idea);
    await writeLog(
      idea.id,
      "metadata",
      `Caption: "${metadata.caption.slice(0, 60)}…"`
    );

    // 8. Post to Instagram (graceful fallback)
    const postResult = await scheduleInstagramPost(
      idea,
      finalVideoUrl,
      metadata
    );

    if (postResult.posted) {
      await updateIdeaStatus(idea.id, "scheduled", {
        caption: metadata.caption,
        hashtags: metadata.hashtags
      });
      await writeLog(
        idea.id,
        "pipeline_end",
        "Pipeline completed. Reel scheduled/posted on Instagram.",
        "success"
      );
      console.log("[pipeline] Done. Status: scheduled");
      return {
        ran: true,
        ideaId: idea.id,
        status: "scheduled",
        message: "Pipeline completed. Reel posted to Instagram."
      };
    } else {
      // Video is ready but Meta posting failed — mark completed, not failed
      await updateIdeaStatus(idea.id, "completed", {
        caption: metadata.caption,
        hashtags: metadata.hashtags,
        error_message: postResult.error
          ? `Meta posting failed: ${postResult.error}`
          : "Meta posting failed — post manually."
      });
      await writeLog(
        idea.id,
        "pipeline_end",
        "Pipeline completed. Video ready but Instagram post failed — manual posting needed.",
        "warn"
      );
      console.log("[pipeline] Done. Status: completed (manual posting needed)");
      return {
        ran: true,
        ideaId: idea.id,
        status: "completed",
        message: "Video ready. Instagram posting failed — post manually."
      };
    }
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[pipeline] FATAL ERROR:", msg);

    await updateIdeaStatus(idea.id, "failed", { error_message: msg });
    await writeLog(idea.id, "pipeline_error", msg, "error");

    return { ran: true, ideaId: idea.id, status: "failed", message: msg };
  }
}

// Allow direct execution: tsx scripts/runPipeline.ts
if (process.argv[1]?.endsWith("runPipeline.ts") || process.argv[1]?.endsWith("runPipeline.js")) {
  runPipeline()
    .then((result) => {
      console.log("=== Pipeline Result ===", result);
      process.exit(result.status === "failed" ? 1 : 0);
    })
    .catch((err) => {
      console.error("Unhandled error:", err);
      process.exit(1);
    });
}
