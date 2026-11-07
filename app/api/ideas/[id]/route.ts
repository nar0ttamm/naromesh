import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/lib/auth";

const SceneSchema = z.object({
  scene_number: z.number().int().positive(),
  visual_prompt: z.string().min(1),
  motion_prompt: z.string().min(1),
  duration_seconds: z.number().min(2).max(4)
});

const UpdateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  full_script: z.string().min(1).optional(),
  scene_breakdown: z
    .array(SceneSchema)
    .min(5)
    .max(8)
    .optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z
    .enum([
      "pending", "processing", "clips_generated",
      "merged", "completed", "scheduled", "posted", "failed"
    ])
    .optional()
});

type Params = { params: Promise<{ id: string }> };

// ---- GET /api/ideas/[id] ----------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("video_ideas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Fetch associated logs
  const { data: logs } = await supabaseAdmin
    .from("pipeline_logs")
    .select("*")
    .eq("idea_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ idea: data, logs: logs ?? [] });
}

// ---- PATCH /api/ideas/[id] --------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateIdeaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("video_ideas")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Idea not found" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ idea: data });
}

// ---- DELETE /api/ideas/[id] -------------------------------------------

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("video_ideas")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
