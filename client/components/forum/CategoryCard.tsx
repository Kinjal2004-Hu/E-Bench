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
    <article className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{category.name}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
      <p className="mt-3 text-xs font-medium text-slate-500">{category.postCount} discussions</p>
    </article>
  );
}
