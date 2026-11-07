import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/lib/auth";
import type { DashboardStats } from "@/types/db";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statuses: Array<keyof DashboardStats> = [
    "pending", "processing", "completed", "scheduled", "posted", "failed"
  ];

  const stats: DashboardStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    scheduled: 0,
    posted: 0,
    failed: 0
  };

  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabaseAdmin
        .from("video_ideas")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      stats[status] = count ?? 0;
    })
  );

  return NextResponse.json({ stats });
}
