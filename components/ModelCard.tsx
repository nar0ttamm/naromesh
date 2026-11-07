"use client";

import { useState } from "react";
import { Pencil, Save, X, ImageIcon } from "lucide-react";
import type { ModelProfile } from "@/types/db";

interface Props {
  profile: ModelProfile;
}

export default function ModelCard({ profile: initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...initialProfile });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    field: keyof ModelProfile,
    value: string | null
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/model-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          base_prompt: form.base_prompt,
          negative_prompt: form.negative_prompt || null,
          reference_image_url: form.reference_image_url || null,
          style_notes: form.style_notes || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }

      setProfile(data.profile);
      setEditing(false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setForm({ ...profile });
    setEditing(false);
    setError("");
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Model Profile</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Controls AI generation style
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary text-xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "Saving…" : "Save"}
            </button>
            <button onClick={handleCancel} className="btn-secondary text-xs">
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="space-y-3 text-sm">
          <Row label="Name" value={profile.name} />
          <Row label="Base Prompt" value={profile.base_prompt} multiline />
          <Row
            label="Negative Prompt"
            value={profile.negative_prompt ?? "—"}
            multiline
          />
          <Row label="Style Notes" value={profile.style_notes ?? "—"} multiline />
          {profile.reference_image_url && (
            <div className="flex items-center gap-2 text-gray-500">
              <ImageIcon className="w-4 h-4 flex-shrink-0" />
              <a
                href={profile.reference_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:underline text-xs truncate max-w-xs"
              >
                Reference image
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Field
            label="Name"
            value={form.name}
            onChange={(v) => handleChange("name", v)}
          />
          <Field
            label="Base Prompt"
            value={form.base_prompt}
            onChange={(v) => handleChange("base_prompt", v)}
            multiline
          />
          <Field
            label="Negative Prompt"
            value={form.negative_prompt ?? ""}
            onChange={(v) => handleChange("negative_prompt", v || null)}
            multiline
          />
          <Field
            label="Style Notes"
            value={form.style_notes ?? ""}
            onChange={(v) => handleChange("style_notes", v || null)}
            multiline
          />
          <Field
            label="Reference Image URL"
            value={form.reference_image_url ?? ""}
            onChange={(v) =>
              handleChange("reference_image_url", v || null)
            }
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  multiline = false
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <p
        className={`mt-0.5 text-gray-800 ${
          multiline ? "whitespace-pre-wrap text-xs" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = ""
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="input text-xs resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input text-xs"
        />
      )}
    </div>
  );
}
