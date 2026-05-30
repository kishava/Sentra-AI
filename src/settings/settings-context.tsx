"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type VoiceMode = "professional" | "analyst" | "calm" | "fast";

export type VoiceLanguage =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "hi"
  | "ja"
  | "zh"
  | "ar"
  | "ko"
  | "it"
  | "nl";

export type SentraSettings = {
  voice: {
    enabled: boolean;
    microphone: boolean;
    autoPlayback: boolean;
    mode: VoiceMode;
    language: VoiceLanguage;
    speed: number;
    volume: number;
  };
  analyst: {
    liveLogs: boolean;
    sourceTracking: boolean;
    reasoningSummaries: boolean;
    automaticVisualizations: boolean;
    worldIntelligence: boolean;
    riskScoring: boolean;
    confidenceScores: boolean;
  };
  forensics: {
    authenticityDetection: boolean;
    aiGeneratedProbability: boolean;
    metadataAnalysis: boolean;
    environmentEstimation: boolean;
    faceIntelligence: boolean;
    faceComparison: boolean;
    deepfakeRisk: boolean;
  };
  brightData: {
    serp: boolean;
    scraper: boolean;
    webUnlocker: boolean;
    mcp: boolean;
    lastSync?: string;
  };
  experience: {
    animations: boolean;
    mouseHoverEffects: boolean;
    particleBackground: boolean;
    soundEffects: boolean;
    compactMode: boolean;
    fullscreenCommandCenter: boolean;
  };
  privacy: {
    doNotIdentifyPeople: boolean;
    onlyCompareUploadedFaces: boolean;
    doNotSearchFaceDatabases: boolean;
    clearUploadsAfterAnalysis: boolean;
  };
};

type SettingsContextValue = {
  settings: SentraSettings;
  updateSettings: (updater: (current: SentraSettings) => SentraSettings) => void;
  resetSettings: () => void;
  exportSettings: () => void;
  clearAnalysisHistory: () => void;
};

const storageKey = "sentra-settings";

export const defaultSettings: SentraSettings = {
  voice: {
    enabled: true,
    microphone: true,
    autoPlayback: false,
    mode: "professional",
    language: "en",
    speed: 1,
    volume: 0.9,
  },
  analyst: {
    liveLogs: true,
    sourceTracking: true,
    reasoningSummaries: true,
    automaticVisualizations: true,
    worldIntelligence: true,
    riskScoring: true,
    confidenceScores: true,
  },
  forensics: {
    authenticityDetection: true,
    aiGeneratedProbability: true,
    metadataAnalysis: true,
    environmentEstimation: true,
    faceIntelligence: true,
    faceComparison: true,
    deepfakeRisk: true,
  },
  brightData: {
    serp: true,
    scraper: true,
    webUnlocker: true,
    mcp: true,
  },
  experience: {
    animations: true,
    mouseHoverEffects: false,
    particleBackground: true,
    soundEffects: true,
    compactMode: false,
    fullscreenCommandCenter: false,
  },
  privacy: {
    doNotIdentifyPeople: true,
    onlyCompareUploadedFaces: true,
    doNotSearchFaceDatabases: true,
    clearUploadsAfterAnalysis: false,
  },
};

function mergeSettings(value: unknown): SentraSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const saved = value as Partial<SentraSettings>;
  return {
    voice: { ...defaultSettings.voice, ...saved.voice },
    analyst: { ...defaultSettings.analyst, ...saved.analyst },
    forensics: { ...defaultSettings.forensics, ...saved.forensics },
    brightData: { ...defaultSettings.brightData, ...saved.brightData },
    experience: { ...defaultSettings.experience, ...saved.experience },
    privacy: { ...defaultSettings.privacy, ...saved.privacy },
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SentraSettings>(defaultSettings);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = mergeSettings(JSON.parse(saved));
        queueMicrotask(() => setSettings(parsed));
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    document.documentElement.dataset.animations = settings.experience.animations ? "on" : "off";
    document.documentElement.dataset.compact = settings.experience.compactMode ? "on" : "off";
    document.documentElement.dataset.fullscreenCommand = settings.experience.fullscreenCommandCenter ? "on" : "off";
  }, [settings]);

  const updateSettings = useCallback((updater: (current: SentraSettings) => SentraSettings) => {
    setSettings((current) => mergeSettings(updater(current)));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const clearAnalysisHistory = useCallback(() => {
    void import("@/lib/history/workspace-history").then(({ clearWorkspaceHistory }) => clearWorkspaceHistory());
  }, []);

  const exportSettings = useCallback(() => {
    const payload = {
      settings,
      exportedAt: new Date().toISOString(),
      histories: {
        workspaceHistory: window.localStorage.getItem("sentra-workspace-history"),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sentra-user-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, exportSettings, clearAnalysisHistory }),
    [clearAnalysisHistory, exportSettings, resetSettings, settings, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
