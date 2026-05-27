import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/branding/santra-logo.png"
      alt=""
      aria-hidden="true"
      width={1536}
      height={1024}
      className={cn(
        "object-contain transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:brightness-110 group-hover:drop-shadow-[0_12px_26px_rgba(255,225,169,0.32)]",
        className,
      )}
      priority
    />
  );
}
