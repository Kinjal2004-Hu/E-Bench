import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const widthClasses = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
] as const;

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  const bucket = Math.round(safeValue / 5);

  return (
    <div role="progressbar" aria-label={`Progress ${safeValue}%`} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-200", className)} {...props}>
      <div className={cn("h-full bg-[#C49A10] transition-all duration-300", widthClasses[bucket])} />
    </div>
  );
}
