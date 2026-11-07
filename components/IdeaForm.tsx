"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import type { VideoIdea, SceneItem } from "@/types/db";

const DEFAULT_SCENE: Omit<SceneItem, "scene_number"> = {
  visual_prompt: "",
  motion_prompt: "",
  duration_seconds: 3
};

interface Props {
  initialData?: VideoIdea;
}

export default function IdeaForm({ initialData }: Props) {
  const isEditing = !!initialData;
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [fullScript, setFullScript] = useState(initialData?.full_script ?? "");
  const [scenes, setScenes] = useState<Omit<SceneItem, "scene_number">[]>(() => {
    if (initialData?.scene_breakdown?.length) {
      return initialData.scene_breakdown.map(({ visual_prompt, motion_prompt, duration_seconds }) => ({
        visual_prompt,
        motion_prompt,
        duration_seconds
      }));
    }
    return Array.from({ length: 5 }, () => ({ ...DEFAULT_SCENE }));
  });
  const [scheduledAt, setScheduledAt] = useState(
    initialData?.scheduled_at
      ? initialData.scheduled_at.slice(0, 16) // trim for datetime-local input
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateScene(
    index: number,
    field: keyof Omit<SceneItem, "scene_number">,
    value: string | number
  ) {
    setScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addScene() {
    if (scenes.length < 8) {
      setScenes((prev) => [...prev, { ...DEFAULT_SCENE }]);
    }
  }

  function removeScene(index: number) {
    if (scenes.length > 5) {
      setScenes((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const sceneBreakdown: SceneItem[] = scenes.map((s, i) => ({
      scene_number: i + 1,
      ...s
    }));

    const payload = {
      title,
      full_script: fullScript,
      scene_breakdown: sceneBreakdown,
      scheduled_at: new Date(scheduledAt).toISOString()
    };

    try {
      const url = isEditing ? `/api/ideas/${initialData!.id}` : "/api/ideas";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data.details?.fieldErrors
          ? Object.entries(data.details.fieldErrors)
              .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
              .join("; ")
          : data.error;
        setError(detail ?? "Something went wrong.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Basic info */}
      <div className="card p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Basic Info</h2>

        <div>
          <label className="label">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Full Script *</label>
          <textarea
            value={fullScript}
            onChange={(e) => setFullScript(e.target.value)}
            rows={5}
            className="input resize-y"
            required
          />
        </div>

        <div>
          <label className="label">Scheduled At *</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>

      {/* Scene breakdown */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Scene Breakdown
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              5–8 scenes, each 2–4 seconds
            </p>
          </div>
          {scenes.length < 8 && (
            <button
              type="button"
              onClick={addScene}
              className="btn-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Scene
            </button>
          )}
        </div>

        <div className="space-y-4">
          {scenes.map((scene, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Scene {index + 1}
                </span>
                {scenes.length > 5 && (
                  <button
                    type="button"
                    onClick={() => removeScene(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <label className="label text-xs">Visual Prompt *</label>
                <textarea
                  value={scene.visual_prompt}
                  onChange={(e) =>
                    updateScene(index, "visual_prompt", e.target.value)
                  }
                  rows={2}
                  className="input text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Motion Prompt *</label>
                <input
                  type="text"
                  value={scene.motion_prompt}
                  onChange={(e) =>
                    updateScene(index, "motion_prompt", e.target.value)
                  }
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Duration (seconds)</label>
                <select
                  value={scene.duration_seconds}
                  onChange={(e) =>
                    updateScene(index, "duration_seconds", Number(e.target.value))
                  }
                  className="input text-xs"
                >
                  <option value={2}>2s</option>
                  <option value={3}>3s</option>
                  <option value={4}>4s</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading
            ? isEditing
              ? "Saving…"
              : "Creating…"
            : isEditing
            ? "Save Changes"
            : "Save reel"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
