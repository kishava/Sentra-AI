import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "sentra-focus min-h-28 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm font-normal text-white placeholder:text-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-2xl transition-all duration-300",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
