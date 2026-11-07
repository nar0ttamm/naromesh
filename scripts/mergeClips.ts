import "dotenv/config";
import fs from "fs";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { trimClip, mergeClips as ffmpegMerge } from "../lib/ffmpeg";
import { isMockMode } from "../lib/utils";
import { getFinalVideoPath, getTempDir } from "../lib/utils.node";
import { writeLog } from "./updateIdeaStatus";
import type { VideoIdea, SceneItem } from "../types/db";
import type { GeneratedClip } from "./generateClips";

/**
 * Trim each generated clip to its scene duration,
 * merge all clips into one final.mp4,
 * and upload to Supabase final-videos bucket.
 *
 * Returns the public URL of the uploaded final video.
 */
export async function mergeAndUpload(
  idea: VideoIdea,
  clips: GeneratedClip[]
): Promise<string> {
  const tempDir = getTempDir(idea.id);
  const scenes = idea.scene_breakdown as SceneItem[];

  // Sort clips by scene_number
  const sorted = [...clips].sort((a, b) => a.scene_number - b.scene_number);

  // Step 1: Trim each clip to its scene duration
  const trimmedPaths: string[] = [];

  for (const clip of sorted) {
    const scene = scenes.find((s) => s.scene_number === clip.scene_number);
    if (!scene) continue;

    const trimmedPath = `${tempDir}/trimmed-${clip.scene_number}.mp4`;

    await writeLog(
      idea.id,
      "trim_clip",
      `Trimming scene ${clip.scene_number} to ${scene.duration_seconds}s…`
    );

    trimClip(clip.local_path, trimmedPath, scene.duration_seconds);
    trimmedPaths.push(trimmedPath);
  }

  // Step 2: Concatenate all trimmed clips
  const finalPath = getFinalVideoPath(idea.id);

  await writeLog(idea.id, "merge_clips", `Merging ${trimmedPaths.length} clips…`);
  ffmpegMerge(trimmedPaths, finalPath);

  await writeLog(idea.id, "merge_clips", "Merge complete.", "success");

  // Step 3: Upload final video to Supabase Storage
  const storageKey = `${idea.id}/final.mp4`;
  const publicUrl = await uploadFinalVideo(idea.id, finalPath, storageKey);

  await writeLog(idea.id, "upload_final", `Uploaded: ${publicUrl}`, "success");

  return publicUrl;
}

async function uploadFinalVideo(
  ideaId: string,
  localPath: string,
  storageKey: string
): Promise<string> {
  if (isMockMode()) {
    return `mock://final-videos/${storageKey}`;
  }

  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await supabaseAdmin.storage
    .from("final-videos")
    .upload(storageKey, fileBuffer, {
      contentType: "video/mp4",
      upsert: true
    });

  if (error) {
    throw new Error(`Final video upload failed: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from("final-videos")
    .getPublicUrl(storageKey);

  return data.publicUrl;
}
