import { useState, useEffect, useRef, useCallback } from "react";

export interface UseAvatarSpeechOptions {
  gender?: "female" | "male";
  voicePreference?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export function useAvatarSpeech(options: UseAvatarSpeechOptions = {}) {
  const { gender = "female", voicePreference = "en-US", onStart, onEnd, onError } = options;

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechVolume, setSpeechVolume] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onStart, onEnd, onError]);

  // Load browser SpeechSynthesis voices
  const loadVoices = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setAvailableVoices(voices);

      // Find optimal voice matching gender and language
      const langPrefix = voicePreference.slice(0, 2).toLowerCase();
      const isFemale = gender === "female";

      // Female voice indicators: "female", "jenny", "sonia", "zira", "aria", "samantha", "susan", "victoria"
      // Male voice indicators: "male", "guy", "david", "george", "mark", "richard", "james", "alex"
      const femaleKeywords = ["female", "jenny", "sonia", "zira", "aria", "samantha", "susan", "victoria", "karen", "hazel"];
      const maleKeywords = ["male", "guy", "david", "george", "mark", "richard", "james", "alex", "daniel", "tom"];

      const targetKeywords = isFemale ? femaleKeywords : maleKeywords;
      const avoidKeywords = isFemale ? maleKeywords : femaleKeywords;

      // 1. Exact match with lang code and target gender keyword
      let bestVoice = voices.find((v) => {
        const nameLower = v.name.toLowerCase();
        const matchesLang = v.lang.toLowerCase().startsWith(langPrefix);
        const matchesGender = targetKeywords.some((k) => nameLower.includes(k));
        const avoidsOpposite = !avoidKeywords.some((k) => nameLower.includes(k) && !nameLower.includes("female"));
        return matchesLang && matchesGender && avoidsOpposite;
      });

      // 2. Any voice in target language matching gender
      if (!bestVoice) {
        bestVoice = voices.find((v) => {
          const nameLower = v.name.toLowerCase();
          return targetKeywords.some((k) => nameLower.includes(k));
        });
      }

      // 3. Any voice in target language
      if (!bestVoice) {
        bestVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      }

      // 4. Default to first voice or English
      if (!bestVoice) {
        bestVoice = voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
      }

      setSelectedVoice(bestVoice);
    }
  }, [gender, voicePreference]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (volumeIntervalRef.current) {
        window.clearInterval(volumeIntervalRef.current);
      }
    };
  }, [loadVoices]);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (volumeIntervalRef.current) {
      window.clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setIsSpeaking(false);
    setSpeechVolume(0);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSupported(false);
        onErrorRef.current?.("Speech synthesis not supported.");
        return;
      }

      if (!text || !text.trim()) return;

      // Cancel any ongoing speech
      cancelSpeech();

      // Clean markdown, quotes, asterisks, brackets from speech text
      const cleanText = text
        .replace(/[*_#`~[\]]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = gender === "female" ? 1.05 : 0.95;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        onStartRef.current?.();

        // Simulate natural audio envelope modulation for mouth animation
        let phase = 0;
        if (volumeIntervalRef.current) window.clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = window.setInterval(() => {
          phase += 0.2;
          // Natural speech wave rhythm
          const raw = Math.sin(phase * 4) * 0.4 + Math.sin(phase * 9) * 0.3 + 0.35;
          const clamped = Math.max(0.15, Math.min(1.0, raw));
          setSpeechVolume(clamped);
        }, 50);
      };

      utterance.onend = () => {
        if (volumeIntervalRef.current) {
          window.clearInterval(volumeIntervalRef.current);
          volumeIntervalRef.current = null;
        }
        setIsSpeaking(false);
        setSpeechVolume(0);
        onEndRef.current?.();
      };

      utterance.onerror = (e) => {
        if (volumeIntervalRef.current) {
          window.clearInterval(volumeIntervalRef.current);
          volumeIntervalRef.current = null;
        }
        setIsSpeaking(false);
        setSpeechVolume(0);
        // Ignore canceled errors triggered intentionally
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("Speech synthesis error:", e);
          onErrorRef.current?.(e);
        }
      };

      // Slight timeout to ensure synthesis queue is fresh in Chromium browsers
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("Failed to invoke speechSynthesis.speak:", err);
          setIsSpeaking(false);
          onErrorRef.current?.(err);
        }
      }, 50);
    },
    [cancelSpeech, gender, selectedVoice]
  );

  return {
    isSpeaking,
    speechVolume,
    isSupported,
    availableVoices,
    selectedVoice,
    speak,
    cancelSpeech,
  };
}
