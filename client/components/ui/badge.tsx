import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-[#F5F1EA] text-[#1C2333]",
  secondary: "bg-[#EDE7D9] text-[#1C2333]",
  success: "bg-[#F5F1EA] text-[#C49A10]",
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
