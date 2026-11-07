import type { ModelProfile, SceneItem } from "@/types/db";

// Build the final prompt sent to fal/Pika for a single scene.
// Structure: base_prompt + visual_prompt + style_notes
export function buildScenePrompt(
  model: ModelProfile,
  scene: SceneItem
): string {
  const parts: string[] = [];

  if (model.base_prompt?.trim()) {
    parts.push(model.base_prompt.trim());
  }

  if (scene.visual_prompt?.trim()) {
    parts.push(scene.visual_prompt.trim());
  }

  if (model.style_notes?.trim()) {
    parts.push(model.style_notes.trim());
  }

  return parts.join(", ");
}

// Negative prompt — fall back to empty string if not set
export function buildNegativePrompt(model: ModelProfile): string {
  return model.negative_prompt?.trim() ?? "";
}

// Generate a simple caption without OpenAI
export function buildFallbackCaption(title: string, script: string): string {
  const firstLine = script.split(/\r?\n/)[0]?.trim() ?? title;
  const trimmed =
    firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
  return trimmed;
}

// Generate basic hashtags from the title when OpenAI is unavailable
export function buildFallbackHashtags(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const base = [
    "#reels",
    "#instagramreels",
    "#viral",
    "#trending",
    "#explore",
    "#shortsvideo",
    "#contentcreator"
  ];

  const custom = words.slice(0, 5).map((w) => `#${w}`);
  return [...new Set([...base, ...custom])].slice(0, 15);
}
