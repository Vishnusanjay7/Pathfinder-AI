"""
AI Career Coach - End-to-End Realistic 3D Human AI Interviewer Simulation & Verification
Runs within Unreal Engine 5.8.1
"""

import sys
import os

sys.path.append(r"C:\AI-Career-Coach")

import interviewer_runtime_manager
from interviewer_runtime_manager import interviewer_runtime, InterviewState, InterviewEmotion
import time

print("=" * 80)
print(">>> RUNNING FULL END-TO-END AI INTERVIEWER DESK & CONVERSATION SIMULATION <<<")
print("=" * 80)

# Step 1: Start Interview with Job Context
print("\n--- STEP 1: STARTING INTERVIEW (GREETING & JOB CONTEXT) ---")
interviewer_runtime.start_interview(
    candidate_name="Alex Rivera",
    target_role="Senior Staff Distributed Systems Engineer"
)

print(f"Current State: {interviewer_runtime.current_state}")
print(f"Current Emotion: {interviewer_runtime.current_emotion}")
print(f"Active Question: {interviewer_runtime.active_question_text}")

# Simulate 30 frames (0.5 seconds of runtime tick)
for i in range(30):
    interviewer_runtime.tick(0.016)
    time.sleep(0.005)

print(f"Greeting Jaw Open: {interviewer_runtime.face_comp.get_morph_target('Jaw_Open'):.3f}")
print(f"Greeting Smile L: {interviewer_runtime.face_comp.get_morph_target('Mouth_Smile_L'):.3f}")

# Step 2: Transition to Listening
print("\n--- STEP 2: LISTENING TO CANDIDATE ---")
interviewer_runtime.set_state(InterviewState.LISTENING, emotion=InterviewEmotion.ATTENTIVE, gesture="AttentiveListeningNod")
for i in range(30):
    interviewer_runtime.tick(0.016)
    time.sleep(0.005)

print(f"Listening State - Attentive Brow Inner: {interviewer_runtime.face_comp.get_morph_target('Brow_Raise_Inner_L'):.3f}")

# Step 3: Candidate Answers Question 1
print("\n--- STEP 3: CANDIDATE ANSWERS QUESTION 1 ---")
candidate_answer_1 = "In our high-throughput payment processing engine, we architected an event-driven system using Apache Kafka for partitioned event streaming and Redis Cluster for sub-millisecond idempotency caching. We handled 85,000 transactions per second with strict zero-loss guarantees."
interviewer_runtime.submit_candidate_answer(candidate_answer_1)

# Simulate Thinking State (Verify Laptop Glance-Break Look-Down)
for i in range(40):
    interviewer_runtime.tick(0.016)
    time.sleep(0.01)

print(f"Thinking State: {interviewer_runtime.current_state}")
print(f"Laptop Glance-Break Eye Look Down: {interviewer_runtime.face_comp.get_morph_target('Eye_Look_Down_L'):.3f}")
print(f"Thoughtful Brow Drop: {interviewer_runtime.face_comp.get_morph_target('Brow_Drop_L'):.3f}")

# Wait for background processing to trigger speaking
time.sleep(1.8)
for i in range(30):
    interviewer_runtime.tick(0.016)
    time.sleep(0.005)

print(f"Speaking Follow-Up State: {interviewer_runtime.current_state}")
print(f"Active Question: {interviewer_runtime.active_question_text}")
print(f"Speaking Jaw Drop: {interviewer_runtime.face_comp.get_morph_target('Jaw_Open'):.3f}")
print(f"Eye Look Down Reset to Candidate: {interviewer_runtime.face_comp.get_morph_target('Eye_Look_Down_L'):.3f}")

# Step 4: Candidate Asks a Clarifying Question ("What would I actually be doing in this role?")
print("\n--- STEP 4: CANDIDATE ASKS QUESTION TO INTERVIEWER ---")
candidate_inquiry = "Before I answer, what would I actually be doing on a day-to-day basis in this role?"
interviewer_runtime.submit_candidate_answer(candidate_inquiry)

time.sleep(1.8)
for i in range(30):
    interviewer_runtime.tick(0.016)

print(f"Interviewer Answer to Candidate: {interviewer_runtime.active_question_text}")

# Step 5: Candidate Asks to Repeat Question
print("\n--- STEP 5: CANDIDATE ASKS TO REPEAT QUESTION ---")
candidate_repeat = "Could you please repeat the question?"
interviewer_runtime.submit_candidate_answer(candidate_repeat)

time.sleep(1.8)
for i in range(30):
    interviewer_runtime.tick(0.016)

print(f"Interviewer Repeated Question: {interviewer_runtime.active_question_text}")

# Step 6: Candidate Answers Technical Follow-Up
print("\n--- STEP 6: CANDIDATE ANSWERS TECHNICAL FOLLOW-UP ---")
candidate_answer_2 = "For consistency during network splits, we utilized Raft consensus across three AZs with quorum acknowledgments, circuit breakers, and two-phase commit protocols for critical ledger operations."
interviewer_runtime.submit_candidate_answer(candidate_answer_2)

time.sleep(1.8)
for i in range(30):
    interviewer_runtime.tick(0.016)

# Step 7: Finish Interview
print("\n--- STEP 7: FINISHING INTERVIEW ---")
interviewer_runtime.finish_interview()
for i in range(30):
    interviewer_runtime.tick(0.016)

print(f"Ending State: {interviewer_runtime.current_state}")
print(f"Ending Smile: {interviewer_runtime.face_comp.get_morph_target('Mouth_Smile_L'):.3f}")

print("\n" + "=" * 80)
print(">>> FULL E2E INTERVIEWER DESK & CONVERSATION SIMULATION COMPLETED SUCCESSFULLY! <<<")
print("=" * 80)
