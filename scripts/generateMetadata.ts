import "dotenv/config";
import { buildFallbackCaption, buildFallbackHashtags } from "../lib/prompts";

interface OpenAILike {
  chat: {
    completions: {
      create: (opts: Record<string, unknown>) => Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}
import { writeLog } from "./updateIdeaStatus";
import type { VideoIdea } from "../types/db";

export interface GeneratedMetadata {
  caption: string;
  hashtags: string[];
}

/**
 * Generate caption and hashtags for the reel.
 * Uses OpenAI if OPENAI_API_KEY is present; falls back to templates otherwise.
 */
export async function generateMetadata(
  idea: VideoIdea
): Promise<GeneratedMetadata> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasOpenAI) {
    try {
      const result = await generateWithOpenAI(idea);
      await writeLog(idea.id, "generate_metadata", "Caption generated via OpenAI.", "success");
      return result;
    } catch (err) {
      await writeLog(
        idea.id,
        "generate_metadata",
        `OpenAI failed, using fallback: ${(err as Error).message}`,
        "warn"
      );
    }
  }

  const caption = buildFallbackCaption(idea.title, idea.full_script);
  const hashtags = buildFallbackHashtags(idea.title);

  await writeLog(
    idea.id,
    "generate_metadata",
    "Caption generated via fallback template.",
    "info"
  );

  return { caption, hashtags };
}

async function generateWithOpenAI(
  idea: VideoIdea
): Promise<GeneratedMetadata> {
  // openai is optional — installed only when OPENAI_API_KEY is set.
  // Use require() so Turbopack/webpack does not statically analyse the import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let OpenAIClass: { new (opts: { apiKey: string }): OpenAILike };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    OpenAIClass = (require("openai") as any).default ?? require("openai");
  } catch {
    throw new Error("openai package is not installed. Run: npm i openai");
  }
  const client = new OpenAIClass({ apiKey: process.env.OPENAI_API_KEY! });

  const systemPrompt = `You are a social media expert. 
Write an engaging Instagram Reel caption and 10-15 relevant hashtags.
Keep the caption concise (under 150 chars), hook-first, Instagram-safe.
Return JSON: { "caption": "...", "hashtags": ["#tag1", ...] }`;

  const userPrompt = `Title: ${idea.title}\n\nScript:\n${idea.full_script}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 300
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    caption?: string;
    hashtags?: string[];
  };

  return {
    caption: parsed.caption ?? buildFallbackCaption(idea.title, idea.full_script),
    hashtags: parsed.hashtags ?? buildFallbackHashtags(idea.title)
  };
}
