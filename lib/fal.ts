/**
 * fal.ai Pika integration wrapper.
 *
 * Uses the @fal-ai/client package.
 * Endpoints (Pika 2.2, 720p, $0.20 per 5s clip):
 *   fal-ai/pika/v2.2/text-to-video   — used when no reference image
 *   fal-ai/pika/v2.2/image-to-video  — used when a public reference image exists
 *
 * Swap either constant to move to Kling, MiniMax, or another fal model.
 *
 * Docs: https://fal.ai/models/fal-ai/pika/v2.2/text-to-video/llms.txt
 */

import { fal } from "@fal-ai/client";
import { sleep, backoffMs, isMockMode } from "./utils";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";

const FAL_TEXT_ENDPOINT = "fal-ai/pika/v2.2/text-to-video";
const FAL_IMAGE_ENDPOINT = "fal-ai/pika/v2.2/image-to-video";

// Configure the fal client once
fal.config({ credentials: process.env.FAL_KEY ?? "" });

export interface GenerateClipInput {
  prompt: string;
  negative_prompt?: string;
  /** URL to reference image for identity consistency */
  image_url?: string;
  duration_seconds?: number; // 3 or 5 — Pika supports 3s/5s
}

export interface GenerateClipResult {
  videoUrl: string;
}

/**
 * Generate a single video clip via fal.ai Pika.
 * Retries up to 2 times with exponential backoff on failure.
 */
export async function generatePikaClip(
  input: GenerateClipInput
): Promise<GenerateClipResult> {
  if (isMockMode()) {
    console.log("[fal] MOCK_MODE — skipping actual generation");
    return { videoUrl: "mock://placeholder.mp4" };
  }

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[fal] Generating clip (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
      );

      const useImage = Boolean(input.image_url);
      const endpoint = useImage ? FAL_IMAGE_ENDPOINT : FAL_TEXT_ENDPOINT;
      const negativePrompt = input.negative_prompt || "ugly, bad, terrible";

      console.log(`[fal] Endpoint: ${endpoint}`);

      // Pika 2.2 only accepts 5s or 10s. Always generate 5s and trim later.
      const result = useImage
        ? await fal.subscribe(FAL_IMAGE_ENDPOINT, {
            input: {
              prompt: input.prompt,
              image_url: input.image_url as string,
              negative_prompt: negativePrompt,
              duration: "5",
              resolution: "720p"
            },
            logs: true,
            onQueueUpdate: (update) => {
              if (update.status === "IN_PROGRESS") {
                update.logs?.forEach((l) => console.log("[fal queue]", l.message));
              }
            }
          })
        : await fal.subscribe(FAL_TEXT_ENDPOINT, {
            input: {
              prompt: input.prompt,
              negative_prompt: negativePrompt,
              duration: "5",
              resolution: "720p",
              aspect_ratio: "9:16"
            },
            logs: true,
            onQueueUpdate: (update) => {
              if (update.status === "IN_PROGRESS") {
                update.logs?.forEach((l) => console.log("[fal queue]", l.message));
              }
            }
          });

      // fal response shape: { data: { video: { url: string } } }
      const data = result.data as { video?: { url?: string }; video_url?: string };
      const videoUrl = data?.video?.url ?? data?.video_url;

      if (!videoUrl) {
        throw new Error("fal response missing video URL: " + JSON.stringify(data));
      }

      console.log("[fal] Clip generated:", videoUrl);
      return { videoUrl };
    } catch (err) {
      const isLastAttempt = attempt === MAX_RETRIES;
      console.error(
        `[fal] Error on attempt ${attempt + 1}:`,
        (err as Error).message
      );

      if (isLastAttempt) {
        throw new Error(
          `fal generation failed after ${MAX_RETRIES + 1} attempts: ${(err as Error).message}`
        );
      }

      const delay = backoffMs(attempt);
      console.log(`[fal] Retrying in ${delay}ms…`);
      await sleep(delay);
    }
  }

  // Unreachable — TypeScript appeasement
  throw new Error("Unexpected exit from retry loop");
}

/**
 * Download a remote video URL to a local file path.
 * Supports both http and https.
 */
export async function downloadClip(
  url: string,
  destPath: string
): Promise<void> {
  if (isMockMode()) {
    // Write a tiny placeholder so FFmpeg doesn't crash in tests
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, "MOCK_CLIP");
    console.log("[fal] MOCK_MODE — wrote placeholder file:", destPath);
    return;
  }

  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    const proto = url.startsWith("https") ? https : http;

    proto
      .get(url, (res) => {
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {}); // Clean up partial file
        reject(err);
      });
  });
}
