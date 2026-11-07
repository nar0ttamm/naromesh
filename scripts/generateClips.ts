import "dotenv/config";
import fs from "fs";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { generatePikaClip, downloadClip } from "../lib/fal";
import { buildScenePrompt, buildNegativePrompt } from "../lib/prompts";
import { isMockMode } from "../lib/utils";
import { getTempDir, getClipPath } from "../lib/utils.node";
import { writeLog } from "./updateIdeaStatus";
import type { VideoIdea, ModelProfile, SceneItem } from "../types/db";

export interface GeneratedClip {
  scene_number: number;
  local_path: string;
  storage_url: string;
}

/**
 * Generate one video clip per scene via fal.ai Pika,
 * download each to /temp/{ideaId}/clip-N.mp4,
 * and upload to Supabase Storage generated-clips bucket.
 */
export async function generateClips(
  idea: VideoIdea,
  model: ModelProfile
): Promise<GeneratedClip[]> {
  const results: GeneratedClip[] = [];
  const tempDir = getTempDir(idea.id);

  for (const scene of idea.scene_breakdown as SceneItem[]) {
    const step = `generate_clip_${scene.scene_number}`;
    await writeLog(
      idea.id,
      step,
      `Generating clip for scene ${scene.scene_number}…`
    );

      const prompt = [buildScenePrompt(model, scene), scene.motion_prompt]
        .filter((part) => part?.trim())
        .join(". ");
    const negative_prompt = buildNegativePrompt(model);
    const localPath = getClipPath(idea.id, scene.scene_number);

    try {
      // Generate via fal.ai
      const { videoUrl } = await generatePikaClip({
        prompt,
        negative_prompt,
        image_url: model.reference_image_url ?? undefined,
        duration_seconds: 5
      });

      // Download to local temp dir
      await downloadClip(videoUrl, localPath);
      console.log(`[generateClips] Clip ${scene.scene_number} downloaded:`, localPath);

      // Upload to Supabase Storage
      const storageKey = `${idea.id}/clip-${scene.scene_number}.mp4`;
      const storageUrl = await uploadClipToStorage(localPath, storageKey);

      results.push({
        scene_number: scene.scene_number,
        local_path: localPath,
        storage_url: storageUrl
      });

      await writeLog(
        idea.id,
        step,
        `Clip ${scene.scene_number} generated and uploaded.`,
        "success"
      );
    } catch (err) {
      const msg = (err as Error).message;
      await writeLog(idea.id, step, `Failed: ${msg}`, "error");
      throw new Error(`Scene ${scene.scene_number} clip generation failed: ${msg}`);
    }
  }

  return results;
}

async function uploadClipToStorage(
  localPath: string,
  storageKey: string
): Promise<string> {
  if (isMockMode()) {
    return `mock://generated-clips/${storageKey}`;
  }

  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await supabaseAdmin.storage
    .from("generated-clips")
    .upload(storageKey, fileBuffer, {
      contentType: "video/mp4",
      upsert: true
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from("generated-clips")
    .getPublicUrl(storageKey);

  return data.publicUrl;
}
