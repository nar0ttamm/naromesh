"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "button" | "list-item";
}

export default function RunPipelineButton({ variant = "button" }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRun() {
    if (loading) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/run/manual", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setResult(data.result?.message ?? "Pipeline started successfully.");
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Network error. Check console.");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "list-item") {
    return (
      <>
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 w-full text-sm text-gray-600 hover:text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? "Running pipeline…" : "Run Pipeline Manually"}
        </button>
        {result && (
          <p
            className={cn(
              "text-xs px-3 py-1",
              result.startsWith("Error") ? "text-red-500" : "text-green-600"
            )}
          >
            {result}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRun}
        disabled={loading}
        className="btn-secondary"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {loading ? "Running…" : "Run Pipeline"}
      </button>
      {result && (
        <p
          className={cn(
            "text-xs",
            result.startsWith("Error") ? "text-red-500" : "text-green-600"
          )}
        >
          {result}
        </p>
      )}
    </div>
  );
}
