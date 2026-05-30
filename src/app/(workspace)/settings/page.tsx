"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  DatabaseZap,
  Download,
  ExternalLink,
  FileText,
  MonitorCog,
  Play,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BrightDataControlCenter } from "@/components/settings/bright-data-control-center";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/workspace-page";
import { VoiceLanguageSelector } from "@/components/voice/language-selector";
import { getVoiceLanguageOption, resolveBrowserTtsLanguage } from "@/lib/voice/languages";
import { type SentraSettings, type VoiceMode, useSettings } from "@/settings/settings-context";

type IntegrationStatus = {
  supabase: boolean;
  supabaseSchema: boolean;
  secretsSource?: "supabase" | "env" | "mixed";
  aiml: boolean;
  openai: boolean;
  llm?: {
    ready: boolean;
    provider: "aiml" | "openai" | null;
    models: Record<string, string> | null;
  };
  aimlVoice?: boolean;
  speechmaticsVoice?: boolean;
  speechmaticsStt?: boolean;
  featherless?: boolean;
  featherlessModels?: { chat: string; vision: string } | null;
  brightData: {
    apiKey: boolean;
    serpZone: boolean;
    unlockerZone: boolean;
    scraperZone?: boolean;
    browserZone?: boolean;
    mcpReady?: boolean;
    ready: boolean;
    message: string;
  };
};

type SettingSection = keyof SentraSettings;

const voiceModes: Array<{ id: VoiceMode; label: string }> = [
  { id: "professional", label: "Professional" },
  { id: "analyst", label: "Analyst" },
  { id: "calm", label: "Calm" },
  { id: "fast", label: "Fast Briefing" },
];

/** Hidden on public deploy — set NEXT_PUBLIC_SENTRA_SHOW_INTEGRATION_STATUS=true to debug locally. */
const SHOW_INTEGRATION_STATUS = process.env.NEXT_PUBLIC_SENTRA_SHOW_INTEGRATION_STATUS === "true";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings, exportSettings, clearAnalysisHistory } = useSettings();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [testing, setTesting] = useState(false);

  const brightDataReady = Boolean(status?.brightData.ready);
  const voiceProfile = useMemo(() => voiceModes.find((mode) => mode.id === settings.voice.mode)?.label ?? "Professional", [settings.voice.mode]);
  const voiceLanguage = useMemo(() => getVoiceLanguageOption(settings.voice.language), [settings.voice.language]);

  useEffect(() => {
    if (!SHOW_INTEGRATION_STATUS) return;
    void testConnection(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save(mutator: (current: SentraSettings) => SentraSettings, message = "Settings saved") {
    updateSettings(mutator);
    toast.success(message);
  }

  function patchSection<TSection extends SettingSection>(
    section: TSection,
    patch: Partial<SentraSettings[TSection]>,
    message?: string,
  ) {
    save((current) => ({ ...current, [section]: { ...current[section], ...patch } }), message);
  }

  async function testConnection(showToast = true) {
    setTesting(true);
    try {
      const response = await fetch("/api/health/integrations");
      const data = (await response.json()) as IntegrationStatus;
      setStatus(data);
      updateSettings((current) => ({
        ...current,
        brightData: { ...current.brightData, lastSync: new Date().toISOString() },
      }));
      if (showToast) {
        toast.success(data.brightData.ready ? "Bright Data connection ready" : "Connection check complete", {
          description: data.brightData.message,
        });
      }
    } catch {
      setStatus(null);
      if (showToast) toast.error("Connection test failed.");
    } finally {
      setTesting(false);
    }
  }

  function resetAll() {
    resetSettings();
    toast.success("Defaults restored");
  }

  function clearHistory() {
    clearAnalysisHistory();
    toast.success("Analysis history cleared");
  }

  function testVoice() {
    if (!settings.voice.enabled) {
      toast.message("AI voice response is disabled.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `Sentra voice mode is ${voiceProfile}. Language is ${voiceLanguage.label}. Settings are active.`,
    );
    utterance.lang = resolveBrowserTtsLanguage(settings.voice.language);
    utterance.rate = settings.voice.speed;
    utterance.volume = settings.voice.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Sentra Control Center"
        title="Settings"
        description="Configure voice, AI analyst behavior, visual forensics, Bright Data routing, privacy guardrails, and command-center experience from one enterprise control surface."
        aside={
          SHOW_INTEGRATION_STATUS ? (
            <Card className="grid content-center gap-4 p-6" glow>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/42">System status</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Enterprise readiness</h2>
                </div>
                <StatusDot ok={brightDataReady} />
              </div>
              <div className="grid gap-2">
                <StatusLine label="AI/ML API (LLM)" ok={status?.aiml || status?.llm?.ready} />
                <StatusLine label="Speechmatics voice (TTS)" ok={status?.speechmaticsVoice ?? status?.aimlVoice} />
                <StatusLine label="Speechmatics STT" ok={status?.speechmaticsStt ?? status?.speechmaticsVoice} />
                <StatusLine label="Bright Data API" ok={status?.brightData.apiKey} />
                <StatusLine label="Workspace database" ok={status?.supabaseSchema} />
              </div>
              <p className="text-xs leading-5 text-white/42">
                Last sync: {settings.brightData.lastSync ? new Date(settings.brightData.lastSync).toLocaleString() : "Not tested yet"}
              </p>
            </Card>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3">
        <Button variant="neon" onClick={() => toast.success("Preferences saved locally")}>
          <CheckCircle2 className="h-4 w-4" /> Save preferences
        </Button>
        <Button variant="ghost" onClick={resetAll}>
          <RotateCcw className="h-4 w-4" /> Reset defaults
        </Button>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2 xl:gap-5">
        <div className="grid gap-4">
        <SettingsCard icon={Volume2} title="Voice Settings" subtitle="Control response playback, microphones, and analyst voice behavior.">
          <ToggleRow label="AI voice response" description="When disabled, AI replies stay text-only." checked={settings.voice.enabled} onChange={(value) => patchSection("voice", { enabled: value })} />
          <ToggleRow label="Microphone listening" description="Hides or disables mic input buttons across Sentra." checked={settings.voice.microphone} onChange={(value) => patchSection("voice", { microphone: value })} />
          <ToggleRow label="Auto speech playback" description="Allows automatic spoken briefings when supported by the browser." checked={settings.voice.autoPlayback} onChange={(value) => patchSection("voice", { autoPlayback: value })} />
          <VoiceLanguageSelector
            value={settings.voice.language}
            onChange={(language) => patchSection("voice", { language }, "Speech language saved")}
          />
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-white/45">
            Speech input uses Speechmatics in 12 languages. English audio uses Speechmatics TTS; other languages use your browser voice for playback.
          </p>
          <Segmented label="Voice mode" value={settings.voice.mode} options={voiceModes} onChange={(value) => patchSection("voice", { mode: value })} />
          <RangeRow label="Voice speed" value={settings.voice.speed} min={0.7} max={1.4} step={0.05} suffix="x" onChange={(value) => patchSection("voice", { speed: value }, "Voice speed saved")} />
          <RangeRow label="Voice volume" value={settings.voice.volume} min={0} max={1} step={0.05} formatter={(value) => `${Math.round(value * 100)}%`} onChange={(value) => patchSection("voice", { volume: value }, "Voice volume saved")} />
          <Button variant="ghost" onClick={testVoice}><Play className="h-4 w-4" /> Test voice</Button>
        </SettingsCard>

        <SettingsCard icon={BrainCircuit} title="AI Analyst Settings" subtitle="Tune live intelligence behavior, reasoning output, and scoring layers.">
          <ToggleRow label="Live logs" description="Shows or hides terminal-style analysis streams." checked={settings.analyst.liveLogs} onChange={(value) => patchSection("analyst", { liveLogs: value })} />
          <ToggleRow label="Source tracking" description="Keeps collection source telemetry visible in analyst workflows." checked={settings.analyst.sourceTracking} onChange={(value) => patchSection("analyst", { sourceTracking: value })} />
          <ToggleRow label="AI reasoning summaries" description="Displays explanation timelines for generated briefings." checked={settings.analyst.reasoningSummaries} onChange={(value) => patchSection("analyst", { reasoningSummaries: value })} />
          <ToggleRow label="Automatic visualization generation" description="Enables radar, graph, forecast, and map panels." checked={settings.analyst.automaticVisualizations} onChange={(value) => patchSection("analyst", { automaticVisualizations: value })} />
          <ToggleRow label="World intelligence mode" description="Controls the AI World Engine workspace." checked={settings.analyst.worldIntelligence} onChange={(value) => patchSection("analyst", { worldIntelligence: value })} />
          <ToggleRow label="Risk scoring" checked={settings.analyst.riskScoring} onChange={(value) => patchSection("analyst", { riskScoring: value })} />
          <ToggleRow label="Confidence scores" checked={settings.analyst.confidenceScores} onChange={(value) => patchSection("analyst", { confidenceScores: value })} />
        </SettingsCard>

        <SettingsCard icon={DatabaseZap} title="Bright Data Settings" subtitle="Control live web collection and demo-safe fallback routing.">
          <ToggleRow label="Bright Data SERP" checked={settings.brightData.serp} onChange={(value) => patchSection("brightData", { serp: value })} />
          <ToggleRow label="Bright Data Scraper" checked={settings.brightData.scraper} onChange={(value) => patchSection("brightData", { scraper: value })} />
          <ToggleRow label="Web Unlocker" checked={settings.brightData.webUnlocker} onChange={(value) => patchSection("brightData", { webUnlocker: value })} />
          <ToggleRow label="Bright Data MCP (search + scrape)" checked={settings.brightData.mcp} onChange={(value) => patchSection("brightData", { mcp: value })} />
          {SHOW_INTEGRATION_STATUS ? (
            <>
              <BrightDataControlCenter />
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">API connection status</p>
                    <p className="mt-1 text-xs leading-5 text-white/44">{status?.brightData.message ?? "Connection has not been tested in this session."}</p>
                  </div>
                  <Badge variant={brightDataReady ? "success" : "risk"}>{brightDataReady ? "Ready" : "Fallback"}</Badge>
                </div>
                <Button variant="ghost" className="mt-4" onClick={() => void testConnection(true)} disabled={testing}>
                  <Activity className={cn("h-4 w-4", testing && "animate-pulse")} /> Test Connection
                </Button>
              </div>
            </>
          ) : null}
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Privacy & Safety Settings" subtitle="Keep biometric and forensic workflows scoped to user-provided evidence.">
          <ToggleRow label="Do not identify real people by name" checked={settings.privacy.doNotIdentifyPeople} onChange={(value) => patchSection("privacy", { doNotIdentifyPeople: value })} />
          <ToggleRow label="Only compare uploaded faces" checked={settings.privacy.onlyCompareUploadedFaces} onChange={(value) => patchSection("privacy", { onlyCompareUploadedFaces: value })} />
          <ToggleRow label="Do not search public face databases" checked={settings.privacy.doNotSearchFaceDatabases} onChange={(value) => patchSection("privacy", { doNotSearchFaceDatabases: value })} />
          <ToggleRow label="Clear uploaded images after analysis" checked={settings.privacy.clearUploadsAfterAnalysis} onChange={(value) => patchSection("privacy", { clearUploadsAfterAnalysis: value })} />
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="ghost" onClick={clearHistory}><Trash2 className="h-4 w-4" /> Clear analysis history</Button>
            <Button variant="ghost" onClick={exportSettings}><Download className="h-4 w-4" /> Export user data</Button>
          </div>
        </SettingsCard>
        </div>

        <div className="grid gap-4">
        <SettingsCard icon={Radar} title="Visual Forensics Settings" subtitle="Select which authenticity and face intelligence modules appear in investigation flows.">
          <ToggleRow label="Image authenticity detection" checked={settings.forensics.authenticityDetection} onChange={(value) => patchSection("forensics", { authenticityDetection: value })} />
          <ToggleRow label="AI-generated image probability" checked={settings.forensics.aiGeneratedProbability} onChange={(value) => patchSection("forensics", { aiGeneratedProbability: value })} />
          <ToggleRow label="Metadata analysis" checked={settings.forensics.metadataAnalysis} onChange={(value) => patchSection("forensics", { metadataAnalysis: value })} />
          <ToggleRow label="Location/environment estimation" checked={settings.forensics.environmentEstimation} onChange={(value) => patchSection("forensics", { environmentEstimation: value })} />
          <ToggleRow label="Face intelligence" description="Hides the AI Face Intelligence workspace when off." checked={settings.forensics.faceIntelligence} onChange={(value) => patchSection("forensics", { faceIntelligence: value })} />
          <ToggleRow label="Face comparison mode" checked={settings.forensics.faceComparison} onChange={(value) => patchSection("forensics", { faceComparison: value })} />
          <ToggleRow label="Deepfake risk analysis" checked={settings.forensics.deepfakeRisk} onChange={(value) => patchSection("forensics", { deepfakeRisk: value })} />
        </SettingsCard>

        <SettingsCard icon={MonitorCog} title="UI / Experience Settings" subtitle="Adjust motion, background effects, and command center density.">
          <ToggleRow label="Animations" description="Disabling this reduces motion globally." checked={settings.experience.animations} onChange={(value) => patchSection("experience", { animations: value })} />
          <ToggleRow label="Mouse hover effects" description="Kept off for a stable enterprise UI." checked={settings.experience.mouseHoverEffects} onChange={(value) => patchSection("experience", { mouseHoverEffects: value })} />
          <ToggleRow label="Particle background" checked={settings.experience.particleBackground} onChange={(value) => patchSection("experience", { particleBackground: value })} />
          <ToggleRow label="Sound effects" checked={settings.experience.soundEffects} onChange={(value) => patchSection("experience", { soundEffects: value })} />
          <ToggleRow label="Compact mode" checked={settings.experience.compactMode} onChange={(value) => patchSection("experience", { compactMode: value })} />
          <ToggleRow label="Fullscreen command center mode" checked={settings.experience.fullscreenCommandCenter} onChange={(value) => patchSection("experience", { fullscreenCommandCenter: value })} />
        </SettingsCard>
        </div>
      </div>

      <Card className="p-5" glow>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-sentra-cyan" />
            <div>
              <p className="text-sm font-semibold text-white">Preference storage</p>
              <p className="mt-1 text-xs text-white/45">Settings are saved in localStorage and applied across AI Face Intelligence, Visual Forensics, Voice AI, Live Logs, and AI Analyst.</p>
            </div>
          </div>
          <Badge variant="violet">Local device policy</Badge>
        </div>
      </Card>

      {SHOW_INTEGRATION_STATUS ? (
        <Card className="p-6" glow>
          <h2 className="text-lg font-semibold text-white">Connection status</h2>
          <ul className="mt-5 space-y-4">
            <StatusRow label="Supabase credentials" ok={status?.supabase} />
            <StatusRow label="Supabase workspace schema" ok={status?.supabaseSchema} />
            <StatusRow
              label={`API keys vault (${status?.secretsSource ?? "env"})`}
              ok={status?.secretsSource === "supabase" || status?.aiml}
            />
            <StatusRow label="AI/ML API (LLM)" ok={status?.aiml || status?.llm?.ready} />
            <StatusRow label="Featherless (open models)" ok={status?.featherless} optional />
            <StatusRow label="Speechmatics voice (TTS)" ok={status?.speechmaticsVoice ?? status?.aimlVoice} />
            <StatusRow label="Speechmatics STT" ok={status?.speechmaticsStt ?? status?.speechmaticsVoice} />
            <StatusRow label="Bright Data API key" ok={status?.brightData?.apiKey} />
            <StatusRow label="Bright Data SERP zone" ok={status?.brightData?.serpZone} />
            <StatusRow label="Bright Data Unlocker zone" ok={status?.brightData?.unlockerZone} />
            <StatusRow label="Bright Data Scraper zone" ok={status?.brightData?.scraperZone} />
            <StatusRow label="Bright Data Browser zone" ok={status?.brightData?.browserZone} />
            <StatusRow label="Bright Data MCP" ok={status?.brightData?.mcpReady} />
          </ul>
          {status?.brightData?.message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
              {status.brightData.message}
            </p>
          )}
          {status?.secretsSource === "env" && status?.supabase && (
            <p className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 text-sm text-cyan-50/90">
              Provider keys are still in local env. Run{" "}
              <code className="font-mono text-xs">npm run secrets:sync</code> to store them in Supabase
              (safe for deploy). On Vercel, only Supabase keys are needed after sync.
            </p>
          )}
          {status?.supabase && !status.supabaseSchema && (
            <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              Authentication is connected, but workspace tables are missing. Run
              {" "}<code className="font-mono text-xs">supabase/migrations/001_initial_schema.sql</code>{" "}
              in the Supabase SQL Editor to enable regular accounts and saved data.
            </p>
          )}
          <Link
            href="https://brightdata.com/cp/zones"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-sentra-cyan hover:text-white"
          >
            Open Bright Data control panel <ExternalLink className="h-4 w-4" />
          </Link>
        </Card>
      ) : null}
    </WorkspacePage>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 md:p-6" glow>
      <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-sentra-cyan">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-white/46">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </Card>
  );
}

function StatusRow({ label, ok, optional }: { label: string; ok?: boolean; optional?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-white/70">
        {label}
        {optional ? <span className="ml-1 text-white/35">(optional)</span> : null}
      </span>
      {ok ? (
        <span className="flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Ready
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-amber-300">
          <XCircle className="h-4 w-4" /> Missing
        </span>
      )}
    </li>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="mt-1 text-xs leading-5 text-white/42">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "sentra-focus relative h-8 w-14 shrink-0 overflow-hidden rounded-full border transition",
          checked ? "border-cyan-200/35 bg-cyan-300/24 shadow-[inset_0_0_18px_rgba(83,244,255,.12)]" : "border-white/12 bg-white/[0.06]",
        )}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={cn(
            "absolute left-1 top-1 block h-6 w-6 rounded-full",
            checked ? "bg-cyan-100 shadow-glow" : "bg-white/60",
          )}
        />
      </button>
    </div>
  );
}

function Segmented<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<{ id: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm font-medium text-white">{label}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "sentra-focus rounded-full border px-3 py-2 text-xs transition",
              value === option.id ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-50" : "border-white/10 text-white/52",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  formatter,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  formatter?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-cyan-100/70">{formatter ? formatter(value) : `${value.toFixed(2)}${suffix}`}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-cyan-300"
      />
    </label>
  );
}

function StatusLine({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <span className="text-xs text-white/55">{label}</span>
      <span className={cn("flex items-center gap-1 text-[11px]", ok ? "text-emerald-200" : "text-amber-200")}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {ok ? "Ready" : "Fallback"}
      </span>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn("relative h-3 w-3 rounded-full", ok ? "bg-emerald-300" : "bg-amber-300")}>
      <span className={cn("absolute inset-0 animate-ping rounded-full", ok ? "bg-emerald-300" : "bg-amber-300")} />
    </span>
  );
}
