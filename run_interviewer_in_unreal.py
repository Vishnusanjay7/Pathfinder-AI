"""
Interactive Launcher for 3D Human AI Interviewer in Unreal Engine 5.8
"""

import sys
import os

sys.path.append(r"C:\AI-Career-Coach")

import interviewer_runtime_manager
from interviewer_runtime_manager import interviewer_runtime, InterviewState, InterviewEmotion
import time

print("=" * 80)
print(">>> INITIALIZING 3D HUMAN AI INTERVIEWER IN UNREAL ENGINE 5.8 <<<")
print("=" * 80)

# Check Character Binding
if not interviewer_runtime.actor:
    interviewer_runtime.find_and_bind_character()

print(f"Interviewer Actor: {interviewer_runtime.actor.get_actor_label() if interviewer_runtime.actor else 'None'}")
print(f"Face Component: {interviewer_runtime.face_comp.get_name() if interviewer_runtime.face_comp else 'None'}")
print(f"Body Component: {interviewer_runtime.body_comp.get_name() if interviewer_runtime.body_comp else 'None'}")

# Start Session
interviewer_runtime.start_interview(
    candidate_name="Candidate",
    target_role="Full Stack AI Engineer"
)

# Run interactive 10-second preview loop
print("\n--- RUNNING LIVE PROCEDURAL ANIMATION LOOP (10s) ---")
start_t = time.time()
frame_count = 0

while time.time() - start_t < 10.0:
    interviewer_runtime.tick(0.016)
    frame_count += 1
    time.sleep(0.016)

print(f"\nSimulated {frame_count} frames successfully.")
print(f"Final State: {interviewer_runtime.current_state}")
print(f"Final Emotion: {interviewer_runtime.current_emotion}")
print(f"Active Question: {interviewer_runtime.active_question_text}")

print("\n" + "=" * 80)
print(">>> 3D HUMAN AI INTERVIEWER READY IN INTERVIEWSTUDIO MAP! <<<")
print("=" * 80)
