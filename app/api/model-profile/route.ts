import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/lib/auth";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  base_prompt: z.string().min(1).optional(),
  negative_prompt: z.string().nullable().optional(),
  reference_image_url: z.string().url().nullable().optional(),
  style_notes: z.string().nullable().optional()
});

// GET default model profile
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("model_profile")
    .select("*")
    .eq("is_default", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No model profile found" }, { status: 404 });
  }

  return NextResponse.json({ profile: data });
}

// PATCH default model profile
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("model_profile")
    .select("id")
    .eq("is_default", true)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Default profile not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("model_profile")
    .update(parsed.data)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
