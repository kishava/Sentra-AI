export type MonitorPromptSelection = {
  requirement: string;
  category?: "any" | "competitor" | "market" | "risk" | "pricing" | "hiring" | "sentiment";
};

const HISTORY_KEY = "sentra-monitor-history";
const MAX_ENTRIES = 12;

export type MonitorHistoryEntry = {
  requirement: string;
  category: string;
  createdAt: string;
};

const defaultSuggestions: MonitorPromptSelection[] = [
  {
    requirement: "Alert me when a competitor changes pricing on their public plans page.",
    category: "pricing",
  },
  {
    requirement: "Tell me if a rival launches a new product in our category.",
    category: "competitor",
  },
  {
    requirement: "Watch for negative sentiment or complaints about our brand online.",
    category: "sentiment",
  },
  {
    requirement: "Monitor hiring spikes for enterprise sales roles at key competitors.",
    category: "hiring",
  },
];

function loadHistory(): MonitorHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as MonitorHistoryEntry[];
    return Array.isArray(parsed) ? parsed.filter((entry) => entry.requirement?.trim()) : [];
  } catch {
    return [];
  }
}

export function recordMonitorHistory(entry: { requirement: string; category: string }) {
  if (typeof window === "undefined") return;
  const next: MonitorHistoryEntry[] = [
    {
      requirement: entry.requirement.trim(),
      category: entry.category,
      createdAt: new Date().toISOString(),
    },
    ...loadHistory().filter(
      (item) => item.requirement.toLowerCase() !== entry.requirement.trim().toLowerCase(),
    ),
  ].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function getMonitorHistory() {
  return loadHistory();
}

/** Strip nested suggestion wrappers so history does not compound "Keep watching…" text. */
export function cleanMonitorRequirement(requirement: string) {
  let text = requirement.trim();
  for (let i = 0; i < 3; i += 1) {
    const next = text
      .replace(/^keep watching\s+/i, "")
      .replace(/^alert me when\s+/i, "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim();
    if (next === text) break;
    text = next;
  }
  return text.slice(0, 280);
}

function topicLabel(requirement: string) {
  const cleaned = cleanMonitorRequirement(requirement);
  if (cleaned.length <= 48) return cleaned;
  return `${cleaned.slice(0, 45)}…`;
}

/** Suggestions tailored from monitors the user has already created. */
export function buildPersonalizedSuggestions(history: MonitorHistoryEntry[]): MonitorPromptSelection[] {
  if (!history.length) return defaultSuggestions;

  const recent = history.slice(0, 3);
  const primary = recent[0];
  const subject = topicLabel(primary.requirement);
  const baseCategory = primary.category as MonitorPromptSelection["category"];

  const related: MonitorPromptSelection[] = [
    {
      requirement: `Alert me when anything important changes for ${subject}.`,
      category: baseCategory ?? "any",
    },
    {
      requirement: `Tell me if news or sentiment about ${subject} turns negative.`,
      category: "sentiment",
    },
    {
      requirement: `Notify me when competitors make pricing moves affecting ${subject}.`,
      category: "pricing",
    },
  ];

  if (recent[1]) {
    related.push({
      requirement: `Also track updates similar to: ${topicLabel(recent[1].requirement)}`,
      category: (recent[1].category as MonitorPromptSelection["category"]) ?? "any",
    });
  } else {
    related.push({
      requirement: `Monitor hiring or GTM expansion signals connected to ${subject}.`,
      category: "hiring",
    });
  }

  return related.slice(0, 4);
}

export function plainEnglishMonitorSummary(input: {
  requirement: string;
  category: string;
  minimumSeverity: string;
  normalizedRequirement?: string;
}): string {
  const watch = input.normalizedRequirement?.trim() || input.requirement.trim();
  const categoryLabel =
    input.category === "any"
      ? "market signals"
      : input.category === "competitor"
        ? "competitor moves"
        : input.category === "pricing"
          ? "pricing changes"
          : input.category === "hiring"
            ? "hiring activity"
            : input.category === "sentiment"
              ? "sentiment shifts"
              : input.category === "risk"
                ? "risk events"
                : "market updates";

  return `I'll watch the live web for ${categoryLabel} about “${watch}” and surface ${input.minimumSeverity}-priority alerts when something matches.`;
}
