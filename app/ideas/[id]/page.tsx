import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Layout from "@/components/Layout";
import IdeaForm from "@/components/IdeaForm";
import StatusBadge from "@/components/StatusBadge";
import LogsPanel from "@/components/LogsPanel";
import { formatDate } from "@/lib/utils";
import type { VideoIdea, PipelineLog } from "@/types/db";

type Props = { params: Promise<{ id: string }> };

export default async function IdeaDetailPage({ params }: Props) {
  if (!(await isAuthenticated())) redirect("/login");

  const { id } = await params;

  const { data: idea } = await supabaseAdmin
    .from("video_ideas")
    .select("*")
    .eq("id", id)
    .single();

  if (!idea) notFound();

  const { data: logs } = await supabaseAdmin
    .from("pipeline_logs")
    .select("*")
    .eq("idea_id", id)
    .order("created_at", { ascending: true });

  const typedIdea = idea as VideoIdea;
  const typedLogs = (logs ?? []) as PipelineLog[];

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        {/* Back + header */}
        <div>
          <Link
            href="/ideas"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to reels
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight break-words">
                {typedIdea.title}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={typedIdea.status} />
                <span className="text-xs text-gray-400">
                  Created {formatDate(typedIdea.created_at)}
                </span>
              </div>
            </div>

            {typedIdea.final_video_url && (
              <a
                href={typedIdea.final_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Watch Video
              </a>
            )}
          </div>

          {/* Caption preview */}
          {typedIdea.caption && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              <p className="font-medium text-xs text-gray-500 mb-1">Caption</p>
              {typedIdea.caption}
              {typedIdea.hashtags && typedIdea.hashtags.length > 0 && (
                <p className="mt-1 text-brand-500 text-xs">
                  {typedIdea.hashtags.join(" ")}
                </p>
              )}
            </div>
          )}

          {typedIdea.error_message && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <p className="font-medium text-xs text-red-500 mb-1">
                Pipeline Error
              </p>
              {typedIdea.error_message}
            </div>
          )}
        </div>

        {/* Edit form */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Edit Idea
          </h2>
          <IdeaForm initialData={typedIdea} />
        </div>

        {/* Pipeline logs */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Pipeline Logs
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {typedLogs.length} log entries
            </p>
          </div>
          <div className="p-4">
            <LogsPanel logs={typedLogs} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
