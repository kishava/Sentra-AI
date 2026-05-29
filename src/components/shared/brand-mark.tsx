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
        "object-contain transition duration-300 ease-out",
        className,
      )}
      priority
    />
  );
}
