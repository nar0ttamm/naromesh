/**
 * FFmpeg helpers using child_process.
 *
 * Kept as a thin wrapper around the ffmpeg CLI so that:
 *  1. We don't need fluent-ffmpeg for the simple trim+stack use-case.
 *  2. Any machine (GitHub Actions, local) only needs ffmpeg in PATH.
 *
 * Output spec for Instagram Reels:
 *  - 720×1280 (9:16)
 *  - 30fps
 *  - h264, yuv420p
 *  - Silent (no audio track needed for AI clips)
 *  - mp4 container
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { isMockMode } from "./utils";
// path and fs are used below for their Node.js-only functionality

const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 1280;
const FPS = 30;

/**
 * Trim a single clip to `durationSeconds` and normalise to the
 * Instagram Reels spec (720×1280, h264, yuv420p, 30fps, silent).
 */
export function trimClip(
  inputPath: string,
  outputPath: string,
  durationSeconds: number
): void {
  if (isMockMode()) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, "MOCK_TRIMMED_CLIP");
    console.log("[ffmpeg] MOCK_MODE — wrote placeholder trimmed clip");
    return;
  }

  const filter = [
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease`,
    `pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
    `fps=${FPS}`,
    "format=yuv420p"
  ].join(",");

  const cmd = [
    "ffmpeg",
    "-y",
    "-i", inputPath,
    "-t", String(durationSeconds),
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", "fast",
    "-an", // strip audio
    outputPath
  ];

  console.log("[ffmpeg] trim:", cmd.join(" "));
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`ffmpeg trim failed with exit code ${result.status}`);
  }
}

/**
 * Concatenate an ordered list of (already-normalised) clips into
 * one final mp4 using the concat demuxer.
 */
export function mergeClips(clipPaths: string[], outputPath: string): void {
  if (isMockMode()) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, "MOCK_FINAL_VIDEO");
    console.log("[ffmpeg] MOCK_MODE — wrote placeholder final.mp4");
    return;
  }

  // Write the concat list file
  const listPath = path.join(path.dirname(outputPath), "concat_list.txt");
  const listContent = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listPath, listContent);

  const cmd = [
    "ffmpeg",
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:v", "libx264",
    "-preset", "fast",
    "-an",
    "-pix_fmt", "yuv420p",
    outputPath
  ];

  console.log("[ffmpeg] merge:", cmd.join(" "));
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });

  // Clean up list file
  try { fs.unlinkSync(listPath); } catch { /* ignore */ }

  if (result.status !== 0) {
    throw new Error(`ffmpeg merge failed with exit code ${result.status}`);
  }
}

/** Quick sanity-check: returns ffmpeg version string or throws */
export function checkFfmpegAvailable(): string {
  try {
    return execSync("ffmpeg -version", { encoding: "utf8" }).split("\n")[0];
  } catch {
    throw new Error(
      "ffmpeg is not available in PATH. Install it before running the pipeline."
    );
  }
}
