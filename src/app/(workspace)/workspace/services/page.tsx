import { Suspense } from "react";
import { OurServicesPage } from "@/components/landing/our-services-page";

export default function WorkspaceServicesPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-white/50">Loading services...</p>}>
      <OurServicesPage basePath="/workspace/services" />
    </Suspense>
  );
}
