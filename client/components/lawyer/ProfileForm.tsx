"use client";

import { useState } from "react";
import { updateLawyerProfile } from "@/lib/lawyerApi";
import type { LawyerProfile } from "@/lib/lawyerApi";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1";
const inputStyle = { borderColor: "#c1b77a", background: "#fdf8e8", color: "#2f3e24" };
const labelCls = "block text-xs font-semibold mb-1";
const labelStyle = { color: "#5a5920" };

export default function ProfileForm({ profile }: { profile: LawyerProfile }) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof LawyerProfile, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setSaved(false);
    setError("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateLawyerProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    field,
    type = "text",
  }: {
    label: string;
    field: keyof LawyerProfile;
    type?: string;
  }) => (
    <div>
      <label className={labelCls} style={labelStyle}>{label}</label>
      <input
        type={type}
        value={(form[field] as string) || ""}
        onChange={(e) => set(field, e.target.value)}
        className={inputCls}
        style={inputStyle}
      />
    </div>
  );

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg shadow-sm border p-6"
      style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
    >
      {/* Photo URL + availability row */}
      <div className="flex gap-4 items-start mb-6">
        <div className="shrink-0">
          {form.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.photoUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2"
              style={{ borderColor: "#c1b77a" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "#757f35" }}
            >
              {(form.fullName || "?").charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className={labelCls} style={labelStyle}>Photo URL</label>
          <input
            type="url"
            value={form.photoUrl || ""}
            onChange={(e) => set("photoUrl", e.target.value)}
            placeholder="https://..."
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" field="fullName" />
        <Field label="Specialization" field="specialization" />
        <Field label="Years of Experience" field="experience" />
        <Field label="Languages Spoken" field="languages" />
        <Field label="Consultation Fee (INR)" field="consultationFee" />
        <Field label="Availability" field="availability" />
      </div>

      <div className="mt-4">
        <label className={labelCls} style={labelStyle}>Professional Bio</label>
        <textarea
          rows={4}
          value={form.professionalSummary || ""}
          onChange={(e) => set("professionalSummary", e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none focus:ring-1"
          style={inputStyle}
        />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60"
          style={{ background: "#757f35" }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
        {saved && (
          <span className="text-sm font-medium" style={{ color: "#2f3e24" }}>
            ✓ Profile updated successfully.
          </span>
        )}
        {error && (
          <span className="text-sm font-medium text-red-600">{error}</span>
        )}
      </div>
    </form>
  );
}
