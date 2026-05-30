"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Globe2, ScanFace } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaceIntelligenceStudio } from "@/features/image-intelligence/face-intelligence-studio";
import { InvestigationStudio } from "@/features/image-intelligence/investigation-studio";
import { WorldEngineStudio } from "@/features/world-engine/world-engine-studio";
import { cn } from "@/lib/utils";
import { useSettings } from "@/settings/settings-context";
import { Card } from "@/components/ui/card";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/workspace-page";

type AnalystMode = "world" | "vision" | "face";

export function AnalystWorkspace() {
  const { settings } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: AnalystMode = modeParam === "vision" ? "vision" : modeParam === "face" ? "face" : "world";

  function selectMode(nextMode: AnalystMode) {
    if (nextMode === "face" && !settings.forensics.faceIntelligence) return;
    router.replace(nextMode === "world" ? "/analyst" : `/analyst?mode=${nextMode}`, { scroll: false });
  }

  const modes = [
    { id: "world" as const, label: "AI World Engine", icon: Globe2 },
    { id: "vision" as const, label: "Visual Forensics", icon: Camera },
    ...(settings.forensics.faceIntelligence ? [{ id: "face" as const, label: "AI Face Intelligence", icon: ScanFace }] : []),
  ];

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="AI Analyst"
        title="Investigation workspace"
        description="Switch between world intelligence, visual forensics, and face authenticity modules. Preferences from Settings control which modes appear here."
      />

      <div className="sticky top-[4.5rem] z-20 -mt-2 mb-2 flex items-center bg-sentra-ink/85 py-3 backdrop-blur-xl">
        <nav className="inline-flex rounded-full border border-white/10 bg-white/[0.045] p-1 shadow-[0_14px_34px_rgba(0,0,0,.22)]" aria-label="AI Analyst modes">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectMode(item.id)}
              className={cn(
                "sentra-focus flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition",
                mode === item.id ? "bg-cyan-300/12 text-cyan-50 shadow-glow" : "text-white/54",
              )}
              aria-current={mode === item.id ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </nav>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {mode === "world" ? (
            <WorldEngineStudio />
          ) : mode === "face" && !settings.forensics.faceIntelligence ? (
            <Card className="grid min-h-80 place-items-center p-8 text-center" glow>
              <div>
                <ScanFace className="mx-auto h-10 w-10 text-sentra-cyan" />
                <h1 className="mt-4 text-xl font-semibold text-white">AI Face Intelligence is disabled</h1>
                <p className="mt-2 text-sm text-white/48">Enable it in Settings to open face authenticity analysis.</p>
              </div>
            </Card>
          ) : mode === "face" ? (
            <FaceIntelligenceStudio />
          ) : (
            <InvestigationStudio />
          )}
        </motion.div>
      </AnimatePresence>
    </WorkspacePage>
  );
}
