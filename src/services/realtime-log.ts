import type {
  ActivityCategory,
  ActivityLevel,
  ActivityLog,
  ActivityStreamEvent,
  PipelineHealth,
} from "@/types/activity-console";

type LogInput = {
  category: ActivityCategory;
  message: string;
  stage: string;
  level?: ActivityLevel;
  source?: string;
  confidence?: number;
  latencyMs?: number;
};

export type ActivityEmitter = (event: ActivityStreamEvent) => void;

export class RealtimeLogService {
  private startedAt = performance.now();
  private eventCount = 0;
  private activeSources = new Set<string>();
  private completedSources = new Set<string>();
  private status: PipelineHealth["status"] = "running";
  private stage = "Initializing";
  private apiLatencyMs?: number;

  constructor(private readonly emit: ActivityEmitter) {}

  log(input: LogInput) {
    this.stage = input.stage;
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category: input.category,
      message: input.message,
      level: input.level ?? "info",
      stage: input.stage,
      source: input.source,
      confidence: input.confidence,
      latencyMs: input.latencyMs,
    };
    this.eventCount += 1;
    this.emit({ type: "log", log });
    this.health();
    return log;
  }

  source(event: Extract<ActivityStreamEvent, { type: "source" }>["source"]) {
    if (event.status === "active" || event.status === "connecting") this.activeSources.add(event.id);
    if (event.status === "success" || event.status === "error" || event.status === "unavailable") {
      this.activeSources.delete(event.id);
      this.completedSources.add(event.id);
    }
    if (event.latencyMs !== undefined && event.channel === "api") this.apiLatencyMs = event.latencyMs;
    this.emit({ type: "source", source: event });
    this.health();
  }

  setStatus(status: PipelineHealth["status"], stage: string) {
    this.status = status;
    this.stage = stage;
    this.health();
  }

  health() {
    this.emit({
      type: "health",
      health: {
        status: this.status,
        stage: this.stage,
        events: this.eventCount,
        activeSources: this.activeSources.size,
        completedSources: this.completedSources.size,
        apiLatencyMs: this.apiLatencyMs,
        elapsedMs: Math.round(performance.now() - this.startedAt),
      },
    });
  }
}

export function encodeSse(event: ActivityStreamEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
