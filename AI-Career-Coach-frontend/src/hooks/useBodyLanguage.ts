import { useCallback, useEffect, useRef, useState } from "react";
import { BodyLanguageAnalyzer, type BodyLanguageMetrics } from "../utils/bodyLanguageAnalyzer";

interface UseBodyLanguageOptions {
  enabled: boolean;
  intervalMs?: number;
  onObservationsUpdate?: (observations: string[]) => void;
  onMetricsUpdate?: (metrics: BodyLanguageMetrics) => void;
}

/**
 * Samples the candidate's camera stream locally every `intervalMs` (default
 * 700ms) and produces observable body-language metrics. All processing stops
 * when `enabled` becomes false (interview ends, fullscreen exits, tab switch,
 * camera stopped) and all resources are released on unmount.
 */
export function useBodyLanguage({
  enabled,
  intervalMs = 700,
  onObservationsUpdate,
  onMetricsUpdate,
}: UseBodyLanguageOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analyzerRef = useRef<BodyLanguageAnalyzer | null>(null);
  const timerRef = useRef<number | null>(null);
  const [metrics, setMetrics] = useState<BodyLanguageMetrics | null>(null);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const obsCbRef = useRef(onObservationsUpdate);
  obsCbRef.current = onObservationsUpdate;
  const metCbRef = useRef(onMetricsUpdate);
  metCbRef.current = onMetricsUpdate;

  const tick = useCallback(() => {
    if (!enabledRef.current) return;
    const video = videoRef.current;
    if (!video || !analyzerRef.current) return;
    const next = analyzerRef.current.sample(video);
    if (!next) return;
    setMetrics(next);
    metCbRef.current?.(next);
    obsCbRef.current?.(next.observations);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      analyzerRef.current?.resetHistory();
      return;
    }
    if (!analyzerRef.current) {
      analyzerRef.current = new BodyLanguageAnalyzer();
    }
    analyzerRef.current.resetHistory();
    tick();
    timerRef.current = window.setInterval(tick, intervalMs);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, intervalMs, tick]);

  // Full cleanup on unmount: release canvas resources and cancel timers.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      analyzerRef.current?.release();
      analyzerRef.current = null;
    };
  }, []);

  return { videoRef, metrics };
}
