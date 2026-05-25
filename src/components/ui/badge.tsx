import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.07] text-white",
        cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
        violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
        risk: "border-rose-300/25 bg-rose-400/10 text-rose-100",
        success: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
