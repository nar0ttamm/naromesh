import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Loader2,
  CheckCircle,
  Calendar,
  XCircle,
  Send,
  Play,
  Plus
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";
import ModelCard from "@/components/ModelCard";
import RunPipelineButton from "@/components/RunPipelineButton";
import { formatDate } from "@/lib/utils";
import type { DashboardStats, VideoIdea, ModelProfile } from "@/types/db";

async function getStats(): Promise<DashboardStats> {
  const statuses: Array<keyof DashboardStats> = [
    "pending", "processing", "completed", "scheduled", "posted", "failed"
  ];

  const counts = await Promise.all(
    statuses.map((s) =>
      supabaseAdmin
        .from("video_ideas")
        .select("id", { count: "exact", head: true })
        .eq("status", s)
        .then(({ count }) => [s, count ?? 0] as const)
    )
  );

  return Object.fromEntries(counts) as unknown as DashboardStats;
}

async function getLatestIdeas(): Promise<VideoIdea[]> {
  const { data } = await supabaseAdmin
    .from("video_ideas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  return (data as VideoIdea[]) ?? [];
}

async function getDefaultProfile(): Promise<ModelProfile | null> {
  const { data } = await supabaseAdmin
    .from("model_profile")
    .select("*")
    .eq("is_default", true)
    .single();
  return (data as ModelProfile) ?? null;
}

export default async function DashboardPage() {
  if (!(await isAuthenticated())) redirect("/login");

  const [stats, ideas, profile] = await Promise.all([
    getStats(),
    getLatestIdeas(),
    getDefaultProfile()
  ]);

  const statCards = [
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-gray-600 bg-gray-100" },
    { label: "Processing", value: stats.processing, icon: Loader2, color: "text-blue-600 bg-blue-100" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600 bg-green-100" },
    { label: "Scheduled", value: stats.scheduled, icon: Calendar, color: "text-teal-600 bg-teal-100" },
    { label: "Posted", value: stats.posted, icon: Send, color: "text-emerald-600 bg-emerald-100" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-600 bg-red-100" }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI reel automation overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RunPipelineButton />
            <Link href="/ideas/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              New Idea
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ideas table */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Ideas
              </h2>
              <Link
                href="/ideas"
                className="text-xs text-brand-500 hover:underline"
              >
                View all →
              </Link>
            </div>

            {ideas.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                No ideas yet.{" "}
                <Link href="/ideas/new" className="text-brand-500 hover:underline">
                  Add one →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs text-gray-500 font-medium px-5 py-2.5 uppercase tracking-wide">
                      Title
                    </th>
                    <th className="text-left text-xs text-gray-500 font-medium px-5 py-2.5 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left text-xs text-gray-500 font-medium px-5 py-2.5 uppercase tracking-wide hidden md:table-cell">
                      Scheduled
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ideas.map((idea) => (
                    <tr key={idea.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/ideas/${idea.id}`}
                          className="font-medium text-gray-900 hover:text-brand-600 line-clamp-1"
                        >
                          {idea.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={idea.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell whitespace-nowrap">
                        {formatDate(idea.scheduled_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Model profile */}
          <div className="space-y-4">
            {profile ? (
              <ModelCard profile={profile} />
            ) : (
              <div className="card p-4 text-sm text-gray-500 text-center">
                No model profile found. Run the SQL schema migration.
              </div>
            )}

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href="/ideas/new"
                  className="flex items-center gap-2 w-full text-sm text-gray-600 hover:text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New Idea
                </Link>
                <RunPipelineButton variant="list-item" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
