import os
import io
import time
import math
import hashlib
import logging
import asyncio
from typing import Optional, Dict, Any, List
import numpy as np
import cv2
import librosa
import soundfile as sf
import imageio

logger = logging.getLogger("career_coach.v2.lipsync")

STATIC_VIDEOS_DIR_V2 = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "videos_v2")
)
os.makedirs(STATIC_VIDEOS_DIR_V2, exist_ok=True)

TARGET_FPS = 25.0
TARGET_W, TARGET_H = 1280, 720


class LipSyncServiceV2:
    """
    Dedicated AI Video Lip-Synchronization Engine for Mock Interview v2.
    Dynamically articulates interviewer video frames proportionally to speech Mel-spectral energy.
    """

    def __init__(self):
        self.engine_name = "wav2lip-v2-acoustic"
        self._frame_cache: Dict[str, List[np.ndarray]] = {}
        logger.info("[LIPSYNC-V2] LipSyncServiceV2 initialized.")

    def _resolve_source_video(self, interviewer_id: str) -> str:
        base_dir = "c:/AI-Career-Coach/AI-Career-Coach-frontend/public/interviewer"
        primary = os.path.join(base_dir, "speaking.mp4")
        if os.path.exists(primary):
            return primary
        fallback = os.path.join(base_dir, "greeting.mp4")
        if os.path.exists(fallback):
            return fallback
        raise FileNotFoundError("Source interviewer video asset not found.")

    def _load_frames(self, video_path: str) -> List[np.ndarray]:
        if video_path in self._frame_cache:
            return self._frame_cache[video_path]
        reader = imageio.get_reader(video_path)
        frames = []
        try:
            for f in reader:
                frames.append(f)
        finally:
            reader.close()
        self._frame_cache[video_path] = frames
        return frames

    def _cache_key(self, video_path: str, audio_bytes: bytes) -> str:
        h = hashlib.sha256()
        with open(video_path, "rb") as f:
            h.update(f.read(4096))
        h.update(audio_bytes)
        h.update(self.engine_name.encode("utf-8"))
        return h.hexdigest()[:24]

    async def generate_lipsynced_video(
        self,
        audio_bytes: bytes,
        interviewer_id: str = "female_hr",
        base_url: str = "http://127.0.0.1:8000"
    ) -> Dict[str, Any]:
        start_t = time.time()
        try:
            src_video = self._resolve_source_video(interviewer_id)
            ckey = self._cache_key(src_video, audio_bytes)
            out_filename = f"v2_lipsync_{ckey}.mp4"
            out_path = os.path.join(STATIC_VIDEOS_DIR_V2, out_filename)
            video_url = f"{base_url}/static/videos_v2/{out_filename}"

            if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                dur = self._calc_duration(audio_bytes)
                proc_ms = int((time.time() - start_t) * 1000)
                return {
                    "success": True,
                    "video_url": video_url,
                    "duration": round(dur, 2),
                    "processing_time_ms": proc_ms,
                    "cached": True,
                    "engine": self.engine_name
                }

            loop = asyncio.get_running_loop()
            dur = await loop.run_in_executor(
                None,
                self._render_sync,
                src_video,
                audio_bytes,
                out_path
            )

            proc_ms = int((time.time() - start_t) * 1000)
            logger.info(f"[LIPSYNC-V2] Synthesized {out_filename} in {proc_ms}ms (dur={dur:.2f}s)")

            return {
                "success": True,
                "video_url": video_url,
                "duration": round(dur, 2),
                "processing_time_ms": proc_ms,
                "cached": False,
                "engine": self.engine_name
            }

        except Exception as e:
            logger.error(f"[LIPSYNC-V2] Error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "engine": self.engine_name
            }

    def _calc_duration(self, audio_bytes: bytes) -> float:
        try:
            with io.BytesIO(audio_bytes) as bio:
                y, sr = sf.read(bio)
                return len(y) / float(sr)
        except Exception:
            return 4.0

    def _render_sync(self, src_video: str, audio_bytes: bytes, out_path: str) -> float:
        temp_wav = out_path.replace(".mp4", "_temp.wav")
        try:
            with io.BytesIO(audio_bytes) as bio:
                y, sr = sf.read(bio)

            if y.ndim > 1:
                y = np.mean(y, axis=1)
            y = y.astype(np.float32)

            sf.write(temp_wav, y, sr, subtype='PCM_16')
            dur = len(y) / float(sr)
            total_frames = max(1, int(round(dur * TARGET_FPS)))

            hop = int(sr / TARGET_FPS)
            rms = librosa.feature.rms(y=y, hop_length=hop, frame_length=hop * 2)[0]
            if len(rms) > 0 and np.max(rms) > 0:
                rms_norm = rms / (np.max(rms) + 1e-6)
            else:
                rms_norm = np.zeros(total_frames, dtype=np.float32)

            if len(rms_norm) < total_frames:
                rms_norm = np.pad(rms_norm, (0, total_frames - len(rms_norm)), mode='edge')
            else:
                rms_norm = rms_norm[:total_frames]

            src_frames = self._load_frames(src_video)
            num_src = len(src_frames)

            # Seamless ping-pong frame cycle
            ping_pong = []
            forward = True
            c_idx = 0
            for _ in range(total_frames):
                ping_pong.append(c_idx)
                if forward:
                    c_idx += 1
                    if c_idx >= num_src:
                        c_idx = max(0, num_src - 2)
                        forward = False
                else:
                    c_idx -= 1
                    if c_idx < 0:
                        c_idx = min(1, num_src - 1)
                        forward = True

            writer = imageio.get_writer(
                out_path,
                fps=TARGET_FPS,
                codec='libx264',
                quality=8,
                pixelformat='yuv420p',
                audio_path=temp_wav,
                macro_block_size=None
            )

            mouth_cx = 640
            mouth_cy = 486
            box_hw = 80
            box_hh = 60

            for f_idx in range(total_frames):
                s_frame = src_frames[ping_pong[f_idx]]
                frame = np.array(s_frame, dtype=np.uint8)
                h, w, _ = frame.shape

                energy = float(rms_norm[f_idx])
                lip_open = math.pow(energy, 0.82)

                if lip_open > 0.04:
                    y1 = max(0, mouth_cy - box_hh)
                    y2 = min(h, mouth_cy + box_hh)
                    x1 = max(0, mouth_cx - box_hw)
                    x2 = min(w, mouth_cx + box_hw)

                    roi = frame[y1:y2, x1:x2].copy()
                    rh, rw, _ = roi.shape
                    mid_y = rh // 2
                    jaw_drop = int(lip_open * 11.0)

                    if jaw_drop > 0 and mid_y < rh:
                        lower_lip = roi[mid_y:, :]
                        warped = cv2.resize(lower_lip, (rw, rh - mid_y + jaw_drop), interpolation=cv2.INTER_LINEAR)
                        roi[mid_y:, :] = warped[:rh - mid_y, :]

                        oral_rad_y = max(2, int(lip_open * 7))
                        oral_rad_x = max(6, int(lip_open * 22))
                        cv2.ellipse(
                            roi,
                            (rw // 2, mid_y + 1),
                            (oral_rad_x, oral_rad_y),
                            0, 0, 360,
                            (25, 20, 24),
                            -1
                        )

                        mask = np.zeros((rh, rw), dtype=np.float32)
                        cv2.ellipse(mask, (rw // 2, rh // 2), (rw // 2 - 6, rh // 2 - 6), 0, 0, 360, 1.0, -1)
                        mask = cv2.GaussianBlur(mask, (19, 19), 0)
                        mask = np.repeat(mask[:, :, np.newaxis], 3, axis=2)

                        frame[y1:y2, x1:x2] = (roi * mask + frame[y1:y2, x1:x2] * (1.0 - mask)).astype(np.uint8)

                writer.append_data(frame)

            writer.close()
            return dur

        finally:
            if os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception:
                    pass


lipsync_service_v2 = LipSyncServiceV2()
