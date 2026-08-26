export interface InterviewerVoiceV2 {
  id: string;
  name: string;
  gender: "female" | "male";
  accent: string;
  provider: "deepgram" | "browser";
}

export interface InterviewerProfileV2 {
  id: "female_hr" | "female_tech" | "male_hr" | "male_tech" | string;
  name: string;
  role: string;
  gender: "female" | "male";
  experience: string;
  specialization: string;
  personality: string;
  interview_style: string;
  default_voice_id: string;
  voice_preference: string;
  office_setting: string;
  description: string;
  avatar_video_src: string;
  avatar_thumbnail_src: string;
  background_backdrop_src: string;
  is_photorealistic: boolean;
  voices: InterviewerVoiceV2[];
}
