"use client";

import { useEffect, useState } from "react";
import ProfileForm from "@/components/lawyer/ProfileForm";
import { fetchLawyerProfile } from "@/lib/lawyerApi";
import type { LawyerProfile } from "@/lib/lawyerApi";

const EMPTY_PROFILE: LawyerProfile = {
  fullName: "",
  specialization: "",
  professionalSummary: "",
  experience: "",
  languages: "",
  consultationFee: "",
  availability: "",
  photoUrl: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<LawyerProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLawyerProfile()
      .then(setProfile)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load profile.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: "#7a7040" }}>Loading…</p>;
  if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Profile Settings</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Update your professional profile, availability, and consultation rates.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
