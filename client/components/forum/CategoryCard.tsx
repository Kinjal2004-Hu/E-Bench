import { BadgeCheck, BriefcaseBusiness, Building2, Scale, Shield, Users } from "lucide-react";
import type { ForumCategory } from "@/lib/forum-data";

const iconMap = {
  Scale,
  Users,
  Building2,
  Shield,
  BadgeCheck,
  BriefcaseBusiness,
};

export default function CategoryCard({ category }: { category: ForumCategory }) {
  const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Scale;

  return (
    <article className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C2333] text-[#C49A10]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-[#1C2333]">{category.name}</h3>
      <p className="mt-1 text-sm text-[#555]">{category.description}</p>
      <p className="mt-2 text-xs text-[#777]">{category.postCount} discussions</p>
    </article>
  );
}
