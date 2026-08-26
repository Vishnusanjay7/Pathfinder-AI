export interface VoiceProfile {
  id: string;
  name: string;
  gender: "male" | "female";
  language: string;
  locale: string;
  provider: string;
  voice_identifier: string;
  speed: number;
  pitch: number;
  isDefault?: boolean;
}

export const FEMALE_VOICES: VoiceProfile[] = [
  {
    id: "en_female_01",
    name: "Sarah (Default)",
    gender: "female",
    language: "English (US)",
    locale: "en-US",
    provider: "Web Speech API",
    voice_identifier: "Microsoft Zira - English (United States)",
    speed: 1.0,
    pitch: 1.0,
    isDefault: true,
  },
  {
    id: "en_female_04",
    name: "Emma",
    gender: "female",
    language: "English (US)",
    locale: "en-US",
    provider: "Web Speech API",
    voice_identifier: "Google US English Female",
    speed: 1.0,
    pitch: 1.0,
  },
  {
    id: "en_female_02",
    name: "Olivia",
    gender: "female",
    language: "English (UK)",
    locale: "en-GB",
    provider: "Web Speech API",
    voice_identifier: "Microsoft Hazel - English (Great Britain)",
    speed: 0.95,
    pitch: 1.0,
  },
  {
    id: "en_female_03",
    name: "Sophia",
    gender: "female",
    language: "English (IN)",
    locale: "en-IN",
    provider: "Web Speech API",
    voice_identifier: "Microsoft Heera - English (India)",
    speed: 1.0,
    pitch: 1.0,
  },
  {
    id: "en_female_05",
    name: "Charlotte",
    gender: "female",
    language: "English (AU)",
    locale: "en-AU",
    provider: "Web Speech API",
    voice_identifier: "Microsoft Catherine - English (Australia)",
    speed: 1.0,
    pitch: 1.0,
  },
];

export const MALE_VOICES: VoiceProfile[] = [
  {
    id: "en_male_01",
    name: "David (Default)",
    gender: "male",
    language: "English (US)",
    locale: "en-US",
    provider: "Web Speech API",
    voice_identifier: "Microsoft David - English (United States)",
    speed: 1.0,
    pitch: 0.95,
    isDefault: true,
  },
  {
    id: "en_male_04",
    name: "Alex",
    gender: "male",
    language: "English (US)",
    locale: "en-US",
    provider: "Web Speech API",
    voice_identifier: "Google US English Male",
    speed: 1.0,
    pitch: 0.95,
  },
  {
    id: "en_male_02",
    name: "George",
    gender: "male",
    language: "English (UK)",
    locale: "en-GB",
    provider: "Web Speech API",
    voice_identifier: "Microsoft George - English (Great Britain)",
    speed: 0.95,
    pitch: 0.95,
  },
  {
    id: "en_male_03",
    name: "Ravi",
    gender: "male",
    language: "English (IN)",
    locale: "en-IN",
    provider: "Web Speech API",
    voice_identifier: "Microsoft Ravi - English (India)",
    speed: 1.0,
    pitch: 0.95,
  },
  {
    id: "en_male_05",
    name: "Liam",
    gender: "male",
    language: "English (AU)",
    locale: "en-AU",
    provider: "Web Speech API",
    voice_identifier: "Microsoft James - English (Australia)",
    speed: 1.0,
    pitch: 0.95,
  },
];

export const PRESET_VOICE_PROFILES: VoiceProfile[] = [...FEMALE_VOICES, ...MALE_VOICES];

/**
 * Preview voice sample using SpeechSynthesis
 */
export function playVoicePreview(text: string, voiceProfile: VoiceProfile, rate: number = 1.0) {
  if (!("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate || voiceProfile.speed || 1.0;
  utterance.pitch = voiceProfile.pitch || 1.0;
  utterance.lang = voiceProfile.locale || "en-US";

  // Find best matching browser voice
  const availableVoices = window.speechSynthesis.getVoices();
  const match = availableVoices.find(
    (v) =>
      v.name.toLowerCase().includes(voiceProfile.name.toLowerCase()) ||
      v.lang.toLowerCase() === voiceProfile.locale.toLowerCase() ||
      v.name.toLowerCase().includes(voiceProfile.gender)
  );

  if (match) {
    utterance.voice = match;
  }

  window.speechSynthesis.speak(utterance);
}
