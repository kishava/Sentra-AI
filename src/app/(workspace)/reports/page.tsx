import { Suspense } from "react";
import { ReportsCenter } from "@/components/reports/reports-center";

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading reports...</p>}>
      <ReportsCenter />
    </Suspense>
  );
}
