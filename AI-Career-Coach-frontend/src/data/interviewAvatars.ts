export interface InterviewerVoice {
  id: string;
  name: string;
  gender: "female" | "male";
  accent: string;
  provider: "deepgram" | "browser" | "local_lipsync";
}

export interface HumanInterviewer {
  id: string;
  name: string;
  role: string;
  gender: "female" | "male";
  experience: string;
  description: string;
  defaultVoiceId: string;
  defaultDeepgramVoice: string;
  defaultAccent: string;
  officeSetting: string;
  thumbnailUrl: string;
  backgroundUrl: string;
  vrmUrl: string;
  voices: InterviewerVoice[];
}

export type VRMInterviewer = HumanInterviewer;

export const INTERVIEW_AVATARS: HumanInterviewer[] = [
  {
    id: "female_hr",
    name: "Priya Sharma",
    role: "Senior Talent Acquisition Director & Executive HR Lead",
    gender: "female",
    experience: "12+ Years Corporate & Executive Tech Hiring",
    description: "Professional HR executive in dark corporate blazer evaluating communication clarity, STAR frameworks, behavioral competencies, problem-solving, and leadership alignment with synchronized audio-driven lip sync.",
    defaultVoiceId: "aura-asteria-en",
    defaultDeepgramVoice: "aura-asteria-en",
    defaultAccent: "Executive Professional US English",
    officeSetting: "Executive Boardroom with Panoramic Skyline View",
    thumbnailUrl: "/avatars/priya_sharma.jpg",
    backgroundUrl: "/avatars/office_backdrop_1.jpg",
    vrmUrl: "/avatars/mpfb.glb",
    voices: [
      { id: "aura-asteria-en", name: "Aura Asteria (Executive Professional)", gender: "female", accent: "en-US", provider: "deepgram" },
      { id: "aura-luna-en", name: "Aura Luna (Warm Corporate UK)", gender: "female", accent: "en-GB", provider: "deepgram" },
    ],
  },
  {
    id: "male_hr",
    name: "Arjun Mehta",
    role: "VP of Talent Acquisition & Global People Strategy",
    gender: "male",
    experience: "14+ Years Global Talent & Leadership Hiring",
    description: "Senior executive in navy business suit evaluating career trajectory, motivation, executive presence, high-stakes stakeholder management, and value creation with realistic audio-driven lip sync.",
    defaultVoiceId: "aura-orion-en",
    defaultDeepgramVoice: "aura-orion-en",
    defaultAccent: "Executive Male US English",
    officeSetting: "Sunlit High-Rise Executive Corner Office",
    thumbnailUrl: "/avatars/arjun_mehta.jpg",
    backgroundUrl: "/avatars/office_backdrop_3.jpg",
    vrmUrl: "/avatars/avaturn.glb",
    voices: [
      { id: "aura-orion-en", name: "Aura Orion (Executive Male)", gender: "male", accent: "en-US", provider: "deepgram" },
      { id: "aura-perseus-en", name: "Aura Perseus (Global Hiring Male)", gender: "male", accent: "en-US", provider: "deepgram" },
    ],
  },
  {
    id: "female_tech",
    name: "Meera Iyer",
    role: "Principal Technical Hiring Architect & Engineering Lead",
    gender: "female",
    experience: "11+ Years Cloud & Distributed Systems Architecture",
    description: "Principal technical architect in corporate blazer evaluating system design depth, technical trade-offs, scalability constraints, microservices, and clean engineering practices.",
    defaultVoiceId: "aura-luna-en",
    defaultDeepgramVoice: "aura-luna-en",
    defaultAccent: "Technical Professional Female US English",
    officeSetting: "Modern Corporate Innovation Suite with Architectural View",
    thumbnailUrl: "/avatars/meera_iyer.jpg",
    backgroundUrl: "/avatars/office_backdrop_2.jpg",
    vrmUrl: "/avatars/brunette.glb",
    voices: [
      { id: "aura-luna-en", name: "Aura Luna (Technical Female)", gender: "female", accent: "en-US", provider: "deepgram" },
      { id: "aura-asteria-en", name: "Aura Asteria (Corporate US)", gender: "female", accent: "en-US", provider: "deepgram" },
    ],
  },
  {
    id: "male_tech",
    name: "Rohan Verma",
    role: "Senior Staff Infrastructure & Systems Engineering Manager",
    gender: "male",
    experience: "12+ Years High-Throughput Infrastructure & Platform Engineering",
    description: "Senior engineering leader in formal suit testing practical engineering acumen, distributed consensus, concurrency, fault-tolerant design, and root-cause debugging capabilities.",
    defaultVoiceId: "aura-arcas-en",
    defaultDeepgramVoice: "aura-arcas-en",
    defaultAccent: "Technical Lead Male US English",
    officeSetting: "Corporate Executive Engineering Office with Modern Workstation",
    thumbnailUrl: "/avatars/rohan_verma.jpg",
    backgroundUrl: "/avatars/office_backdrop_4.jpg",
    vrmUrl: "/avatars/avatarsdk.glb",
    voices: [
      { id: "aura-arcas-en", name: "Aura Arcas (Technical Lead Male)", gender: "male", accent: "en-US", provider: "deepgram" },
      { id: "aura-orion-en", name: "Aura Orion (Executive Male)", gender: "male", accent: "en-US", provider: "deepgram" },
    ],
  },
];

export function getAvatarById(id?: string): HumanInterviewer {
  if (!id) return INTERVIEW_AVATARS[0];
  const normalized = id.toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized.includes("priya") || normalized.includes("female01") || normalized.includes("femalehr")) {
    return INTERVIEW_AVATARS[0];
  }
  if (normalized.includes("arjun") || normalized.includes("male01") || normalized.includes("malehr")) {
    return INTERVIEW_AVATARS[1];
  }
  if (normalized.includes("meera") || normalized.includes("female02") || normalized.includes("femaletech") || normalized.includes("neha") || normalized.includes("sneha")) {
    return INTERVIEW_AVATARS[2];
  }
  if (normalized.includes("rohan") || normalized.includes("male02") || normalized.includes("maletech") || normalized.includes("rohit") || normalized.includes("vikram")) {
    return INTERVIEW_AVATARS[3];
  }

  const found = INTERVIEW_AVATARS.find((a) => a.id === id);
  return found || INTERVIEW_AVATARS[0];
}
