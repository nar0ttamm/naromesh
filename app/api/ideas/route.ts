import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/lib/auth";
import type { CreateIdeaPayload } from "@/types/db";

// ---- Validation schema ------------------------------------------------

const SceneSchema = z.object({
  scene_number: z.number().int().positive(),
  visual_prompt: z.string().min(1),
  motion_prompt: z.string().min(1),
  duration_seconds: z.number().min(2).max(4)
});

const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  full_script: z.string().min(1),
  scene_breakdown: z
    .array(SceneSchema)
    .min(5, "Minimum 5 scenes required")
    .max(8, "Maximum 8 scenes allowed"),
  scheduled_at: z.string().datetime({ message: "Invalid ISO date" })
});

// ---- GET /api/ideas ---------------------------------------------------

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const from = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from("video_ideas")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ideas: data, total: count, page, limit });
}

// ---- POST /api/ideas --------------------------------------------------

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateIdeaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const payload: CreateIdeaPayload = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("video_ideas")
    .insert({ ...payload, status: "pending" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ idea: data }, { status: 201 });
}
