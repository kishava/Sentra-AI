import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "sentra-focus min-h-28 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm text-white placeholder:text-white/40 backdrop-blur-xl transition-colors hover:border-white/20",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
