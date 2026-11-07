"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import IdeaTable from "@/components/IdeaTable";
import type { VideoIdea } from "@/types/db";

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ideas?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this idea? This also removes all pipeline logs.")) return;

    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setIdeas((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      alert("Failed to delete idea.");
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reels</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {ideas.length} saved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIdeas}
              disabled={loading}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/ideas/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              New reel
            </Link>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400 animate-pulse">
              Loading ideas…
            </div>
          ) : (
            <IdeaTable ideas={ideas} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </Layout>
  );
}
