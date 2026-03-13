"use client";

import ProfileForm from "@/components/lawyer/ProfileForm";
import { lawyerProfile } from "@/data/mockLawyerData";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Profile Settings</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Update your professional profile, availability, and consultation rates.
        </p>
      </div>
      <ProfileForm profile={lawyerProfile} />
    </div>
  );
}
