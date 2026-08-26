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
    id: "male_hr",
    name: "Arjun Mehta (Male Interviewer 01)",
    role: "Senior Talent Acquisition Director & Executive HR Lead",
    gender: "male",
    experience: "14+ Years Global Talent & Leadership Hiring",
    description: "Senior Talent Acquisition Director evaluating executive leadership presence, STAR behavioral competencies, communication clarity, problem-solving, and culture alignment with audio-driven lip sync.",
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
    id: "female_hr",
    name: "Priya Sharma",
    role: "Senior Talent Acquisition Lead",
    gender: "female",
    experience: "12+ Years Corporate & Tech Executive Hiring",
    description: "Professional executive HR interviewer evaluating communication clarity, STAR frameworks, behavioral competencies, problem-solving, and leadership alignment with synchronized audio-driven lip sync.",
    defaultVoiceId: "aura-asteria-en",
    defaultDeepgramVoice: "aura-asteria-en",
    defaultAccent: "Professional Corporate US English",
    officeSetting: "Executive Boardroom with Glass Skyline View",
    thumbnailUrl: "/avatars/priya_sharma.jpg",
    backgroundUrl: "/avatars/office_backdrop_1.jpg",
    vrmUrl: "/avatars/female-1.vrm",
    voices: [
      { id: "aura-asteria-en", name: "Aura Asteria (Executive Professional)", gender: "female", accent: "en-US", provider: "deepgram" },
      { id: "aura-luna-en", name: "Aura Luna (Warm Corporate UK)", gender: "female", accent: "en-GB", provider: "deepgram" },
    ],
  },
  {
    id: "female_tech",
    name: "Neha Verma",
    role: "Principal Software Architect & Engineering Hiring Lead",
    gender: "female",
    experience: "10+ Years Cloud & Distributed Systems Architecture",
    description: "Senior technical architect evaluating system design depth, technical trade-offs, scalability constraints, microservices, and clean engineering practices.",
    defaultVoiceId: "aura-luna-en",
    defaultDeepgramVoice: "aura-luna-en",
    defaultAccent: "Technical Professional US English",
    officeSetting: "Modern Tech Innovation Hub with Architecture Whiteboard",
    thumbnailUrl: "/avatars/neha_verma.jpg",
    backgroundUrl: "/avatars/office_backdrop_2.jpg",
    vrmUrl: "/avatars/female-2.vrm",
    voices: [
      { id: "aura-luna-en", name: "Aura Luna (Technical Female)", gender: "female", accent: "en-US", provider: "deepgram" },
      { id: "aura-asteria-en", name: "Aura Asteria (Corporate US)", gender: "female", accent: "en-US", provider: "deepgram" },
    ],
  },
  {
    id: "male_tech",
    name: "Rohit Sen",
    role: "Senior Staff Infrastructure & Distributed Systems Engineer",
    gender: "male",
    experience: "11+ Years High-Throughput Infrastructure & Low-Latency Systems",
    description: "Senior infrastructure engineer testing practical engineering acumen, distributed consensus, concurrency, fault-tolerant design, and root-cause debugging capabilities.",
    defaultVoiceId: "aura-arcas-en",
    defaultDeepgramVoice: "aura-arcas-en",
    defaultAccent: "Technical Lead Male US English",
    officeSetting: "Engineering R&D Center with Multi-Monitor Workstation",
    thumbnailUrl: "/avatars/rohit_singh.jpg",
    backgroundUrl: "/avatars/office_backdrop_4.jpg",
    vrmUrl: "/avatars/male-2.vrm",
    voices: [
      { id: "aura-arcas-en", name: "Aura Arcas (Technical Lead Male)", gender: "male", accent: "en-US", provider: "deepgram" },
      { id: "aura-orion-en", name: "Aura Orion (Executive Male)", gender: "male", accent: "en-US", provider: "deepgram" },
    ],
  },
];

export function getAvatarById(id?: string): HumanInterviewer {
  if (!id) return INTERVIEW_AVATARS[0];
  const normalized = id.toLowerCase().replace(/[\s_-]+/g, "");
  
  if (normalized.includes("maleinterviewer") || normalized.includes("male01") || normalized.includes("malehr") || normalized.includes("arjun")) {
    return INTERVIEW_AVATARS[0];
  }
  if (normalized.includes("priya") || normalized.includes("femalehr")) {
    return INTERVIEW_AVATARS[1];
  }
  if (normalized.includes("neha") || normalized.includes("femaletech")) {
    return INTERVIEW_AVATARS[2];
  }
  if (normalized.includes("rohit") || normalized.includes("maletech")) {
    return INTERVIEW_AVATARS[3];
  }

  const found = INTERVIEW_AVATARS.find((a) => a.id === id);
  return found || INTERVIEW_AVATARS[0];
}
