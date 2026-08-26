/**
 * Lightweight, fully local, browser-side analyzer of OBSERVABLE candidate
 * visual behavior sampled from the candidate's own camera stream.
 *
 * Only measures things a camera can actually see:
 *   - face visibility & camera framing
 *   - head vertical position (posture proxy) and head motion
 *   - horizontal position of the face (eye-gaze direction proxy)
 *
 * It deliberately does NOT make psychological/emotional claims (no "nervous",
 * "lying", "confident", "stressed"). Every label and observation below is an
 * observable physical behavior.
 *
 * Frames are sampled every ~700ms on a small offscreen canvas; no video is
 * recorded or sent anywhere.
 */

export interface BehaviorScore {
  score: number;
  label: string;
}

export interface BodyLanguageMetrics {
  posture: BehaviorScore;
  eyeGaze: BehaviorScore;
  headMovement: BehaviorScore;
  frame: BehaviorScore;
  bodyLanguageScore: number;
  observations: string[];
  sampling: boolean;
}

const WIDTH = 96;
const HEIGHT = 72;
const SKIN_MIN = WIDTH * HEIGHT * 0.005;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function rounded(value: number): number {
  return Math.round(clamp(value));
}

export class BodyLanguageAnalyzer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private prevGray: Float32Array | null = null;
  private motionHistory: number[] = [];
  private readonly maxHistory = 6;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true }) || null;
  }

  release(): void {
    this.canvas = null;
    this.ctx = null;
    this.prevGray = null;
    this.motionHistory = [];
  }

  resetHistory(): void {
    this.prevGray = null;
    this.motionHistory = [];
  }

  sample(video: HTMLVideoElement): BodyLanguageMetrics | null {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return null;
    if (video.readyState < 2 || video.videoWidth === 0 || video.paused) return null;

    const stream = video.srcObject;
    if (!(stream instanceof MediaStream)) return null;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== "live") return null;

    ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    } catch {
      return null;
    }
    const data = imageData.data;

    const gray = new Float32Array(WIDTH * HEIGHT);
    let skinCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = WIDTH;
    let maxX = -1;
    let minY = HEIGHT;
    let maxY = -1;

    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = y;

      const cr = (r - y) * 0.713 + 128;
      const cb = (b - y) * 0.564 + 128;
      if (cr >= 133 && cr <= 173 && cb >= 77 && cb <= 127 && r > 60 && g > 40 && b > 20) {
        skinCount++;
        const x = i % WIDTH;
        const yp = Math.floor(i / WIDTH);
        sumX += x;
        sumY += yp;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (yp < minY) minY = yp;
        if (yp > maxY) maxY = yp;
      }
    }

    // Frame-to-frame motion (head/body movement between samples).
    let motion = 0;
    if (this.prevGray) {
      let diff = 0;
      for (let i = 0; i < gray.length; i += 2) {
        diff += Math.abs(gray[i] - this.prevGray[i]);
      }
      motion = diff / (gray.length / 2) / 255;
    }
    this.prevGray = gray;

    this.motionHistory.push(motion);
    if (this.motionHistory.length > this.maxHistory) this.motionHistory.shift();
    const avgMotion = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;

    // Skin geometry — only meaningful when enough skin pixels are present.
    let skinRatio = 0;
    let cx = 0.5;
    let bboxTop = 0.4;
    let _bboxW = 0;
    if (skinCount > SKIN_MIN) {
      skinRatio = skinCount / (WIDTH * HEIGHT);
      cx = sumX / skinCount / WIDTH;
      bboxTop = minY / HEIGHT;
      _bboxW = (maxX - minX + 1) / WIDTH;
    }

    return this.computeMetrics(motion, avgMotion, skinRatio, cx, bboxTop);
  }

  private computeMetrics(
    motion: number,
    avgMotion: number,
    skinRatio: number,
    cx: number,
    bboxTop: number
  ): BodyLanguageMetrics {
    const faceVisible = skinRatio >= 0.01;

    // ── Posture (head vertical position within the frame) ──────────────────
    let posture: BehaviorScore;
    if (!faceVisible) {
      posture = { score: 60, label: "Unclear" };
    } else {
      const score = rounded(100 - Math.max(0, bboxTop - 0.1) * 260);
      posture = {
        score,
        label: score >= 75 ? "Upright" : score >= 55 ? "Neutral" : "Slouched",
      };
    }

    // ── Eye gaze direction (horizontal face position relative to center) ───
    const gazeOffset = Math.abs(cx - 0.5);
    let gaze: BehaviorScore;
    if (!faceVisible) {
      gaze = { score: 45, label: "Away" };
    } else {
      const score = rounded(100 - gazeOffset * 300);
      gaze = {
        score,
        label: score >= 78 ? "Stable" : score >= 58 ? "To the side" : "Away",
      };
    }

    // ── Head movement (rolling frame-to-frame motion) ───────────────────────
    let head: BehaviorScore;
    if (motion > 0.12 || avgMotion > 0.09) {
      head = { score: rounded(100 - Math.max(motion, avgMotion) * 500), label: "Excessive" };
    } else if (avgMotion > 0.045) {
      head = { score: rounded(100 - avgMotion * 400), label: "Moderate" };
    } else {
      head = { score: rounded(100 - avgMotion * 200), label: "Stable" };
    }
    head.score = clamp(head.score, 20, 100);

    // ── Camera framing (face visible, centered, reasonable size) ────────────
    let frame: BehaviorScore;
    if (!faceVisible) {
      frame = { score: 40, label: "Away" };
    } else {
      const sizeScore = Math.max(0, 0.2 - skinRatio) * 250;
      const centerScore = Math.max(0, gazeOffset - 0.08) * 160;
      const score = rounded(100 - sizeScore - centerScore);
      frame = {
        score,
        label: score >= 80 ? "Good" : score >= 60 ? "Slightly off-center" : "Away",
      };
    }

    const bodyLanguageScore = Math.round(
      posture.score * 0.3 + gaze.score * 0.25 + head.score * 0.25 + frame.score * 0.2
    );

    const observations: string[] = [];
    if (faceVisible) {
      observations.push("Face visible and centered in the camera frame.");
    } else {
      observations.push("Face not fully visible in the camera frame.");
    }
    if (posture.label === "Upright") observations.push("Maintained upright posture.");
    if (posture.label === "Neutral") observations.push("Posture remained neutral.");
    if (posture.label === "Slouched") observations.push("Head positioned lower in frame; slouching observed.");
    if (posture.label === "Unclear") observations.push("Posture could not be reliably measured (face out of frame).");
    if (gaze.label === "Stable") observations.push("Maintained steady eye gaze toward the camera.");
    if (gaze.label === "To the side") observations.push("Eye gaze shifted to the side of the camera.");
    if (gaze.label === "Away") observations.push("Looking away from the camera.");
    if (head.label === "Stable") observations.push("Head movement remained stable.");
    if (head.label === "Moderate") observations.push("Moderate head movement observed.");
    if (head.label === "Excessive") observations.push("Excessive head movement observed.");
    if (frame.label === "Good") observations.push("Camera framing is good.");
    if (frame.label === "Slightly off-center") observations.push("Camera framing slightly off-center.");
    if (frame.label === "Away") observations.push("Camera framing indicates the face is partially out of view.");

    return {
      posture,
      eyeGaze: gaze,
      headMovement: head,
      frame,
      bodyLanguageScore: Math.round(clamp(bodyLanguageScore)),
      observations,
      sampling: true,
    };
  }
}
