import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "sentra-focus flex h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-normal text-white placeholder:text-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-2xl transition-all duration-300",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
