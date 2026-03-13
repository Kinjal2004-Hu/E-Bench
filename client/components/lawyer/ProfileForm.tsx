"use client";

import { useState } from "react";
import type { LawyerProfile } from "@/data/mockLawyerData";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1";
const inputStyle = { borderColor: "#c1b77a", background: "#fdf8e8", color: "#2f3e24" };
const labelCls = "block text-xs font-semibold mb-1";
const labelStyle = { color: "#5a5920" };

export default function ProfileForm({ profile }: { profile: LawyerProfile }) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  const set = (field: keyof LawyerProfile, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Field = ({ label, field, type = "text" }: { label: string; field: keyof LawyerProfile; type?: string }) => (
    <div>
      <label className={labelCls} style={labelStyle}>{label}</label>
      <input
        type={type}
        value={form[field]}
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
              {form.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className={labelCls} style={labelStyle}>Photo URL</label>
          <input
            type="url"
            value={form.photoUrl}
            onChange={(e) => set("photoUrl", e.target.value)}
            placeholder="https://..."
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" field="name" />
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
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none focus:ring-1"
          style={inputStyle}
        />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
          style={{ background: "#757f35" }}
        >
          Save Profile
        </button>
        {saved && (
          <span className="text-sm font-medium" style={{ color: "#2f3e24" }}>
            ✓ Profile updated successfully.
          </span>
        )}
      </div>
    </form>
  );
}
