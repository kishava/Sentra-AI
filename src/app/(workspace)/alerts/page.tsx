"use client";

import { Suspense } from "react";
import { MonitorCenter } from "@/components/dashboard/monitor-center";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/workspace-page";

function AlertsPageContent() {
  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Monitors"
        badgeVariant="cyan"
        title="Watch what matters"
        description="Describe a competitor or market signal in plain language. Sentra checks the live web on a schedule and when you tap Check now."
      />

      <MonitorCenter />
    </WorkspacePage>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading monitors…</p>}>
      <AlertsPageContent />
    </Suspense>
  );
}
