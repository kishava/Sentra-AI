import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "sentra-focus flex h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white placeholder:text-white/40 backdrop-blur-xl transition-colors hover:border-white/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
