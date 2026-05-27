"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPipelineLog, type PipelineLogStep } from "@/lib/pipeline-log-scripts";
import type { ActivityLog } from "@/types/activity-console";

export function usePipelineLogs(script: PipelineLogStep[]) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [running, setRunning] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setRunning(false);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    setLogs([]);
    setRunning(true);

    let elapsed = 0;
    script.forEach((step) => {
      elapsed += step.delayMs;
      const timer = window.setTimeout(() => {
        setLogs((current) => [...current, createPipelineLog(step)]);
      }, elapsed);
      timersRef.current.push(timer);
    });
  }, [clearTimers, script]);

  const complete = useCallback(() => {
    clearTimers();
    setRunning(false);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { logs, running, start, stop, complete, setLogs };
}
