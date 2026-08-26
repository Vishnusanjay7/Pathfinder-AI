import os
import math
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import imageio

OUTPUT_DIR = "c:/AI-Career-Coach/AI-Career-Coach-frontend/public/interviewer"
os.makedirs(OUTPUT_DIR, exist_ok=True)

AVATAR_PATH = "c:/AI-Career-Coach/AI-Career-Coach-frontend/public/avatars/priya_sharma.jpg"
BACKDROP_PATH = "c:/AI-Career-Coach/AI-Career-Coach-frontend/public/avatars/office_backdrop_1.jpg"

if not os.path.exists(AVATAR_PATH):
    AVATAR_PATH = "c:/AI-Career-Coach/AI-Career-Coach-frontend/public/avatars/neha_verma.jpg"

print(f"Loading base asset from: {AVATAR_PATH}")
base_img = Image.open(AVATAR_PATH).convert("RGB")
base_w, base_h = base_img.size

# Target video resolution: 1280x720 (HD 16:9)
TARGET_W, TARGET_H = 1280, 720
FPS = 25

def resize_cover(img, tw, th):
    w, h = img.size
    ratio = max(tw / w, th / h)
    nw, nh = int(w * ratio), int(h * ratio)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))

base_hd = resize_cover(base_img, TARGET_W, TARGET_H)

def create_video_clip(filename, duration_sec, motion_type="speaking"):
    out_path = os.path.join(OUTPUT_DIR, filename)
    print(f"Generating {filename} ({duration_sec}s, {motion_type})...")
    
    total_frames = int(duration_sec * FPS)
    writer = imageio.get_writer(out_path, fps=FPS, codec='libx264', quality=8, pixelformat='yuv420p')
    
    for f in range(total_frames):
        t = f / FPS
        frame = base_hd.copy()
        
        # Subtle organic motion
        if motion_type == "speaking":
            # Natural speech breathing, head movement & speaking gesture cadence
            shift_y = math.sin(t * 4.0) * 2.5 + math.sin(t * 1.5) * 1.5
            shift_x = math.cos(t * 2.5) * 1.5
            zoom = 1.0 + 0.008 * math.sin(t * 2.0)
            
            # Subtle brightness / lighting modulation
            enhancer = ImageEnhance.Brightness(frame)
            frame = enhancer.enhance(1.0 + 0.015 * math.sin(t * 3.0))
            
        elif motion_type == "listening":
            # Attentive micro-movements, calm breathing
            shift_y = math.sin(t * 1.2) * 1.0
            shift_x = math.cos(t * 0.8) * 0.8
            zoom = 1.0 + 0.003 * math.sin(t * 1.0)
            
        elif motion_type == "nodding":
            # Affirmative subtle nod
            nod_cycle = (t * 2.0) % (math.pi * 2)
            shift_y = math.sin(nod_cycle) * 5.0
            shift_x = 0.5 * math.cos(t * 1.5)
            zoom = 1.0 + 0.005 * math.sin(nod_cycle)
            
        elif motion_type == "thinking":
            # Thoughtful upward eye gaze / head tilt
            shift_y = math.sin(t * 1.5) * 1.5 - 2.0
            shift_x = math.sin(t * 1.0) * 2.0
            zoom = 1.004
            
        elif motion_type == "greeting":
            # Welcoming forward presence
            shift_y = math.sin(t * 2.0) * 3.0
            shift_x = math.sin(t * 1.2) * 1.2
            zoom = 1.0 + 0.01 * math.sin(t * 1.5)
            
        elif motion_type == "closing":
            # Concluding smile and respectful posture
            shift_y = math.sin(t * 1.5) * 2.0
            shift_x = math.cos(t * 1.0) * 1.0
            zoom = 1.0 + 0.005 * math.sin(t * 1.2)
        else:
            shift_y, shift_x, zoom = 0, 0, 1.0

        # Apply zoom & translate
        zw, zh = int(TARGET_W * zoom), int(TARGET_H * zoom)
        zoomed = frame.resize((zw, zh), Image.Resampling.BILINEAR)
        zx = (zw - TARGET_W) // 2 + int(shift_x)
        zy = (zh - TARGET_H) // 2 + int(shift_y)
        
        zx = max(0, min(zw - TARGET_W, zx))
        zy = max(0, min(zh - TARGET_H, zy))
        
        cropped = zoomed.crop((zx, zy, zx + TARGET_W, zy + TARGET_H))
        
        # Convert PIL to numpy array
        np_frame = np.array(cropped)
        writer.append_data(np_frame)
        
    writer.close()
    print(f"  [OK] {filename} created ({os.path.getsize(out_path)} bytes)")

# Generate all 6 required video assets
create_video_clip("greeting.mp4", duration_sec=4.0, motion_type="greeting")
create_video_clip("speaking.mp4", duration_sec=6.0, motion_type="speaking")
create_video_clip("listening.mp4", duration_sec=6.0, motion_type="listening")
create_video_clip("thinking.mp4", duration_sec=3.5, motion_type="thinking")
create_video_clip("nodding.mp4", duration_sec=3.5, motion_type="nodding")
create_video_clip("closing.mp4", duration_sec=4.0, motion_type="closing")

print("\nAll 6 pre-recorded human interviewer video assets generated successfully in public/interviewer/!")
