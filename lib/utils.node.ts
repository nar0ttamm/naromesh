/**
 * Node.js-only utilities (use fs, path).
 * Do NOT import this file from client components or shared lib files.
 * Safe to import from: scripts/, lib/ffmpeg.ts, lib/fal.ts, API routes.
 */

import path from "path";
import fs from "fs";

// Build the local temp directory for a specific idea
export function getTempDir(ideaId: string): string {
  const dir = path.join(process.cwd(), "temp", ideaId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Clip file path inside the temp dir
export function getClipPath(ideaId: string, sceneNumber: number): string {
  return path.join(getTempDir(ideaId), `clip-${sceneNumber}.mp4`);
}

// Final merged video path
export function getFinalVideoPath(ideaId: string): string {
  return path.join(getTempDir(ideaId), "final.mp4");
}
