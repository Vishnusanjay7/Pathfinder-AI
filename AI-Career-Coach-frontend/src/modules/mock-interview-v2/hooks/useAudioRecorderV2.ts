import { useState, useEffect, useRef, useCallback } from "react";

export interface UseAudioRecorderOptionsV2 {
  silenceThresholdMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  onTranscriptInterim?: (interim: string) => void;
  onTranscriptFinal?: (finalText: string) => void;
}

export function useAudioRecorderV2({
  silenceThresholdMs = 1500,
  onSpeechStart,
  onSpeechEnd,
  onTranscriptInterim,
  onTranscriptFinal,
}: UseAudioRecorderOptionsV2) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimText, setInterimText] = useState<string>("");
  const [volumeLevel, setVolumeLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);

  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onInterimRef = useRef(onTranscriptInterim);
  const onFinalRef = useRef(onTranscriptFinal);

  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
    onInterimRef.current = onTranscriptInterim;
    onFinalRef.current = onTranscriptFinal;
  }, [onSpeechStart, onSpeechEnd, onTranscriptInterim, onTranscriptFinal]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    clearSilenceTimer();
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setIsListening(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("[STT-v2] Web Speech Recognition not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript + " ";
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentFinal) {
          accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + currentFinal).trim();
          setTranscript(accumulatedTranscriptRef.current);
          onFinalRef.current?.(accumulatedTranscriptRef.current);
        }

        setInterimText(currentInterim);
        onInterimRef.current?.(currentInterim);

        // Reset silence timer on candidate speech
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          onSpeechStartRef.current?.();
        }

        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          const complete = (accumulatedTranscriptRef.current + " " + currentInterim).trim();
          if (complete.length > 3) {
            console.log(`[STT-v2] Natural silence (${silenceThresholdMs}ms) detected -> auto-submitting answer`);
            isSpeakingRef.current = false;
            onSpeechEndRef.current?.(complete);
          }
        }, silenceThresholdMs);
      };

      rec.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("[STT-v2] Recognition error:", e);
        }
      };

      rec.onend = () => {
        // Auto-restart if still in listening mode
        if (isListening && recognitionRef.current === rec) {
          try {
            rec.start();
          } catch {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn("[STT-v2] Could not start speech recognition:", err);
    }
  }, [clearSilenceTimer, isListening, silenceThresholdMs]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, [clearSilenceTimer]);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
  }, []);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [clearSilenceTimer]);

  return {
    isListening,
    transcript,
    interimText,
    volumeLevel,
    startListening,
    stopListening,
    resetTranscript,
  };
}
