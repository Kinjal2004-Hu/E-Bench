import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-blue-50 text-blue-700",
  secondary: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", badgeVariants[variant], className)}
      {...props}
    />
  );
}
