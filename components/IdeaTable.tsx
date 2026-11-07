"use client";

import Link from "next/link";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatDate } from "@/lib/utils";
import type { VideoIdea } from "@/types/db";

interface Props {
  ideas: VideoIdea[];
  onDelete: (id: string) => void;
}

export default function IdeaTable({ ideas, onDelete }: Props) {
  if (ideas.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        No video ideas yet.{" "}
        <Link href="/ideas/new" className="text-brand-500 hover:underline">
          Add your first idea →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Title
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
              Scheduled
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
              Video
            </th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {ideas.map((idea) => (
            <tr key={idea.id} className="hover:bg-gray-50 group">
              <td className="py-3 px-4">
                <Link
                  href={`/ideas/${idea.id}`}
                  className="font-medium text-gray-900 hover:text-brand-600 line-clamp-1"
                >
                  {idea.title}
                </Link>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={idea.status} />
              </td>
              <td className="py-3 px-4 text-gray-500 hidden md:table-cell whitespace-nowrap">
                {formatDate(idea.scheduled_at)}
              </td>
              <td className="py-3 px-4 hidden lg:table-cell">
                {idea.final_video_url ? (
                  <a
                    href={idea.final_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-500 hover:underline"
                  >
                    Watch <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => onDelete(idea.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
