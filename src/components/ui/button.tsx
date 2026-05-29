import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "sentra-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.01em] transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-white/[0.96] bg-[length:180%_180%] text-sentra-ink shadow-[0_8px_22px_rgba(0,0,0,.15)] hover:bg-white hover:shadow-[0_13px_32px_rgba(0,0,0,.22)]",
        neon:
          "bg-[linear-gradient(135deg,#53f4ff_0%,#3f9cff_36%,#6272ff_68%,#a855f7_100%)] bg-[length:220%_220%] text-white shadow-[0_10px_25px_rgba(38,118,235,.3)] hover:bg-[position:100%_50%] hover:brightness-110 hover:shadow-[0_15px_40px_rgba(83,244,255,.22),0_10px_34px_rgba(98,114,255,.24)]",
        ghost:
          "border border-white/10 bg-white/[0.045] bg-[linear-gradient(135deg,rgba(255,255,255,.06),rgba(83,244,255,.03),rgba(168,85,247,.035))] bg-[length:220%_220%] text-white backdrop-blur-xl hover:border-cyan-200/25 hover:bg-white/[0.085] hover:bg-[position:100%_50%] hover:shadow-[0_12px_30px_rgba(83,244,255,.08)]",
        link: "text-blue-300 underline-offset-4 hover:text-blue-200 hover:underline",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
