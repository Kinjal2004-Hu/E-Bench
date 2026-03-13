import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...props} />;
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardHeader(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 pb-0", className)} {...props} />;
});

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, ...props },
  ref
) {
  return <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900", className)} {...props} />;
});

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn("text-sm text-slate-600", className)} {...props} />;
  }
);

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("p-5", className)} {...props} />;
});

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />;
});
