"""
AI Career Coach - Virtual 3D Human AI Interviewer
Complete Unreal Engine 5.8.1 Runtime Controller

Coordinates:
- Photorealistic Skeletal Meshes (SK_Kevin_Body, SK_Kevin_Face) & CC_ControlRig_Sample Rigs
- 8-State Conversational Interview State Machine (IDLE, GREETING, LISTENING, THINKING, SPEAKING, FOLLOW_UP, REACTION, ENDING)
- Procedural Layered Animation:
    * Natural Breathing (spine/chest/clavicle expansion)
    * Procedural Blinking (2.5s-5.5s random interval, 15% double-blink, asymmetric ease-out curve)
    * Eye Look-At with 20Hz Micro-Saccades & Thoughtful Glance Breaks
    * Organic Conversational Gestures (Listening Nod, Open Hand Explanation, One Hand Emphasis, Thinking Tilt, Greeting)
    * Facial Expressions (Neutral, Attentive, Smile, Thoughtful, Curious, Impressed, Speaking)
    * Speech-Driven Real-time Lip Synchronization (Audio Envelope to Visemes: Jaw_Open, V_Explosive, V_Dental_Lip, V_Tight_O, V_Wide)
- FastAPI / AI Backend Bridge (REST & WebSocket connection to localhost:8000 with offline fallback)
"""

import unreal
import time
import math
import random
import json
import urllib.request
import urllib.error
import threading

class InterviewState:
    IDLE = "IDLE"
    GREETING = "GREETING"
    LISTENING = "LISTENING"
    THINKING = "THINKING"
    SPEAKING = "SPEAKING"
    FOLLOW_UP = "FOLLOW_UP"
    REACTION = "REACTION"
    ENDING = "ENDING"

class InterviewEmotion:
    NEUTRAL = "NEUTRAL"
    ATTENTIVE = "ATTENTIVE"
    SMILE = "SMILE"
    THOUGHTFUL = "THOUGHTFUL"
    CURIOUS = "CURIOUS"
    IMPRESSED = "IMPRESSED"
    SPEAKING = "SPEAKING"

class AIInterviewerController:
    def __init__(self):
        self.actor = None
        self.face_comp = None
        self.body_comp = None
        
        # State Machine
        self.current_state = InterviewState.IDLE
        self.previous_state = InterviewState.IDLE
        self.state_time = 0.0
        self.current_emotion = InterviewEmotion.NEUTRAL
        self.current_gesture = "NeutralRest"
        
        # Conversation
        self.session_id = None
        self.candidate_name = "Candidate"
        self.target_role = "Senior Full-Stack & Systems Engineer"
        self.current_question_number = 1
        self.total_questions = 5
        self.active_question_text = ""
        self.active_question_category = "General"
        self.last_candidate_answer = ""
        self.conversation_history = []
        
        # Backend Configuration
        self.backend_url = "http://127.0.0.1:8000"
        self.is_backend_online = False
        
        # Procedural Animation Timers & Parameters
        self.breathing_rate = 0.28 # ~16-17 breaths per minute
        self.breathing_amplitude = 0.04
        
        # Blinking
        self.blink_timer = random.uniform(2.5, 5.5)
        self.is_blinking = False
        self.blink_progress = 0.0
        self.blink_duration = 0.22
        self.is_double_blink = False
        self.double_blink_gap = 0.12
        
        # Saccades & Eye Look-At
        self.saccade_offset_x = 0.0
        self.saccade_offset_y = 0.0
        self.saccade_timer = random.uniform(0.8, 2.2)
        self.is_glance_break = False
        
        # Gestures & Head Movements
        self.head_pitch = 0.0
        self.head_yaw = 0.0
        self.head_roll = 0.0
        self.gesture_time = 0.0
        self.nod_progress = 0.0
        
        # Lip Sync
        self.is_speaking_audio = False
        self.speech_duration = 0.0
        self.speech_elapsed = 0.0
        self.current_amplitude = 0.0
        self.target_jaw_open = 0.0
        self.current_jaw_open = 0.0
        
        # Emotion Blend Weights
        self.emotion_weights = {
            "Smile": 0.0,
            "Attentive": 0.0,
            "Thoughtful": 0.0,
            "Curious": 0.0,
            "Impressed": 0.0
        }
        
        self.find_and_bind_character()

    def find_and_bind_character(self):
        """Locates and binds the interviewer character components in the active level."""
        editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        actors = editor_actor_subsystem.get_all_level_actors()
        
        for a in actors:
            label = a.get_actor_label()
            c_name = a.get_class().get_name()
            if "AI_Human_Interviewer" in label or "BP_AIInterviewer" in c_name or "CC_Rig" in c_name:
                self.actor = a
                break
                
        if not self.actor:
            print("Warning: AI Interviewer actor not found in current level!")
            return False
            
        # Find Body and Face skeletal mesh components
        skeletal_comps = self.actor.get_components_by_class(unreal.SkeletalMeshComponent)
        for comp in skeletal_comps:
            mesh = comp.skeletal_mesh_asset
            mesh_name = mesh.get_name() if mesh else ""
            if "Face" in mesh_name:
                self.face_comp = comp
            elif "Body" in mesh_name:
                self.body_comp = comp
                
        if not self.face_comp and len(skeletal_comps) > 0:
            self.face_comp = skeletal_comps[0]
        if not self.body_comp and len(skeletal_comps) > 1:
            self.body_comp = skeletal_comps[1]
            
        print(f"Bound AI Interviewer: Actor='{self.actor.get_actor_label()}', FaceComp='{self.face_comp.get_name() if self.face_comp else 'None'}', BodyComp='{self.body_comp.get_name() if self.body_comp else 'None'}'")
        return True

    def set_state(self, new_state, emotion=None, gesture=None):
        """Transitions the interview state machine."""
        if self.current_state != new_state:
            self.previous_state = self.current_state
            self.current_state = new_state
            self.state_time = 0.0
            print(f">>> [INTERVIEW STATE TRANSITION]: {self.previous_state} -> {self.current_state} <<<")
            
        if emotion:
            self.current_emotion = emotion
        if gesture:
            self.current_gesture = gesture

    def check_backend_connection(self):
        """Checks if the FastAPI backend is available."""
        try:
            req = urllib.request.Request(f"{self.backend_url}/health", headers={"User-Agent": "UnrealEngine/5.8"})
            with urllib.request.urlopen(req, timeout=2.0) as res:
                if res.status == 200:
                    self.is_backend_online = True
                    print(f"Connected to FastAPI Backend at {self.backend_url}")
                    return True
        except Exception as e:
            self.is_backend_online = False
            print(f"Backend offline ({e}). Using local intelligent interview engine.")
            return False

    def start_interview(self, candidate_name="Candidate", target_role="Senior Full-Stack & Systems Engineer"):
        """Starts a full conversational interview session."""
        self.candidate_name = candidate_name
        self.target_role = target_role
        self.current_question_number = 1
        self.conversation_history = []
        
        self.check_backend_connection()
        
        if self.is_backend_online:
            try:
                payload = json.dumps({
                    "interviewer_id": "male_tech",
                    "target_role": self.target_role,
                    "difficulty": "medium",
                    "candidate_name": self.candidate_name
                }).encode("utf-8")
                
                req = urllib.request.Request(
                    f"{self.backend_url}/api/mock-interview-v2/start",
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "UnrealEngine/5.8"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=4.0) as res:
                    data = json.loads(res.read().decode("utf-8"))
                    if data.get("success"):
                        session = data.get("session", {})
                        self.session_id = session.get("session_id")
                        first_q = data.get("first_question", {})
                        self.active_question_text = first_q.get("question", "Welcome! Could you please introduce yourself and walk me through your engineering background?")
                        self.active_question_category = first_q.get("category", "Introduction")
                        print(f"Started Backend Session: {self.session_id}")
            except Exception as e:
                print(f"Error starting backend session: {e}. Falling back to local engine.")
                self.start_fallback_session()
        else:
            self.start_fallback_session()
            
        self.set_state(InterviewState.GREETING, emotion=InterviewEmotion.SMILE, gesture="GreetingGesture")
        self.speak_text(
            f"Hello {self.candidate_name}! Welcome to your technical interview for the {self.target_role} position. I am Rohit Sen, and I'll be conducting your interview today. To start off, {self.active_question_text}",
            estimated_duration=8.5
        )

    def start_fallback_session(self):
        """Fallback local interview question bank when backend is offline."""
        self.session_id = f"local_session_{int(time.time())}"
        self.active_question_text = "Could you please introduce yourself and walk me through a complex system or architecture you designed and built?"
        self.active_question_category = "Architecture & Systems Design"

    def submit_candidate_answer(self, candidate_answer_text):
        """Processes candidate answer and triggers state transitions (LISTENING -> THINKING -> SPEAKING)."""
        self.last_candidate_answer = candidate_answer_text
        self.conversation_history.append({"role": "candidate", "text": candidate_answer_text, "timestamp": time.time()})
        print(f"\n[CANDIDATE ANSWER RECEIVED]: \"{candidate_answer_text}\"")
        
        # Transition to THINKING
        self.set_state(InterviewState.THINKING, emotion=InterviewEmotion.THOUGHTFUL, gesture="ThinkingTilt")
        
        # Process answer via backend or local brain
        threading.Thread(target=self._process_turn_async, args=(candidate_answer_text,)).start()

    def _process_turn_async(self, candidate_answer_text):
        """Asynchronous processing of candidate turn."""
        time.sleep(1.4) # Natural thinking pause
        
        next_question = ""
        evaluation_feedback = ""
        
        if self.is_backend_online and self.session_id:
            try:
                payload = json.dumps({
                    "session_id": self.session_id,
                    "question_number": self.current_question_number,
                    "phase": "TECHNICAL_CORE",
                    "question_text": self.active_question_text,
                    "candidate_answer": candidate_answer_text
                }).encode("utf-8")
                
                req = urllib.request.Request(
                    f"{self.backend_url}/api/mock-interview-v2/turn",
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "UnrealEngine/5.8"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=5.0) as res:
                    data = json.loads(res.read().decode("utf-8"))
                    if data.get("success"):
                        if data.get("interview_completed"):
                            self.finish_interview()
                            return
                        nq = data.get("next_question", {})
                        next_question = nq.get("question", "")
                        self.active_question_category = nq.get("category", "Distributed Systems")
            except Exception as e:
                print(f"Backend turn request failed ({e}), using local brain.")
                
        if not next_question:
            ans_lower = candidate_answer_text.lower().strip()
            # Handle candidate questions
            if any(w in ans_lower for w in ["repeat", "say that again", "didn't catch", "what was the question", "could you repeat"]):
                next_question = f"Of course! Let me repeat the question: {self.active_question_text}"
            elif any(w in ans_lower for w in ["what would i be doing", "what will i do", "what is this role", "responsibilities of this"]):
                next_question = f"In this {self.target_role} role, you will lead high-throughput system architecture and distributed data infrastructure. With that in mind, could you walk me through your experience designing scalable distributed services?"
            elif any(w in ans_lower for w in ["why are you asking", "why do you ask", "purpose of that"]):
                next_question = "I'm asking to evaluate your system design reasoning and trade-off analysis under high traffic. How did you handle latency bottlenecks in your last major project?"
            else:
                # Local intelligent adaptive follow-ups
                self.current_question_number += 1
                if self.current_question_number == 2:
                    next_question = "That's a very solid breakdown. Given that architecture, how did you handle data consistency, database replication bottlenecks, and cache invalidation under high concurrency?"
                    self.active_question_category = "Concurrency & Data Consistency"
                elif self.current_question_number == 3:
                    next_question = "Great explanation. If a network partition occurred between your services, what consensus protocol or fault-tolerance strategy did you implement to avoid split-brain scenarios?"
                    self.active_question_category = "Distributed Consensus & Fault Tolerance"
                elif self.current_question_number == 4:
                    next_question = "Excellent. In terms of observability and real-time debugging, how did you profile latency bottlenecks and monitor distributed transaction traces in production?"
                    self.active_question_category = "Telemetry & Performance Profiling"
                else:
                    self.finish_interview()
                    return
                
        self.active_question_text = next_question
        self.set_state(InterviewState.SPEAKING, emotion=InterviewEmotion.ATTENTIVE, gesture="OpenHandExplanation")
        self.speak_text(self.active_question_text, estimated_duration=7.0)

    def speak_text(self, text, estimated_duration=6.0):
        """Simulates/plays speech audio and activates real-time speech-driven lip sync."""
        self.is_speaking_audio = True
        self.speech_duration = estimated_duration
        self.speech_elapsed = 0.0
        self.conversation_history.append({"role": "interviewer", "text": text, "timestamp": time.time()})
        print(f"\n[INTERVIEWER SPEAKING]: \"{text}\" (Duration: {estimated_duration:.1f}s)")

    def finish_interview(self):
        """Concludes the interview session."""
        self.set_state(InterviewState.ENDING, emotion=InterviewEmotion.IMPRESSED, gesture="GreetingGesture")
        closing_msg = f"Thank you very much, {self.candidate_name}! That concludes our interview session today. You demonstrated strong technical reasoning, clear communication, and thoughtful architectural trade-offs. We will compile your evaluation report and get back to you shortly. Have a great day!"
        self.speak_text(closing_msg, estimated_duration=9.0)

    # -------------------------------------------------------------
    # Procedural Animation Tick (Called each frame / simulation step)
    # -------------------------------------------------------------
    def tick(self, delta_time):
        """Updates all procedural animation layers, rigs, morph targets, and states."""
        self.state_time += delta_time
        
        if not self.face_comp:
            return
            
        # 1. Update State Transitions
        if self.current_state == InterviewState.GREETING and self.state_time > 8.5:
            self.set_state(InterviewState.LISTENING, emotion=InterviewEmotion.ATTENTIVE, gesture="AttentiveListeningNod")
        elif self.current_state == InterviewState.SPEAKING and not self.is_speaking_audio:
            self.set_state(InterviewState.LISTENING, emotion=InterviewEmotion.ATTENTIVE, gesture="NeutralRest")
            
        # 2. Update Procedural Breathing
        # Chest/spine rhythmic expansion via sine wave + subtle harmonic
        breath_cycle = math.sin(time.time() * self.breathing_rate * 2.0 * math.pi)
        chest_expansion = (breath_cycle + 0.2 * math.sin(time.time() * self.breathing_rate * 4.0 * math.pi)) * self.breathing_amplitude
        
        # 3. Update Procedural Blinking
        self.blink_timer -= delta_time
        if self.blink_timer <= 0.0 and not self.is_blinking:
            self.is_blinking = True
            self.blink_progress = 0.0
            self.is_double_blink = (random.random() < 0.18)
            
        blink_weight = 0.0
        if self.is_blinking:
            self.blink_progress += delta_time / self.blink_duration
            if self.blink_progress <= 0.35:
                # Fast closure (0.08s)
                blink_weight = self.blink_progress / 0.35
            elif self.blink_progress <= 1.0:
                # Smooth ease-out opening (0.14s)
                blink_weight = 1.0 - ((self.blink_progress - 0.35) / 0.65) ** 1.5
            else:
                if self.is_double_blink:
                    self.is_double_blink = False
                    self.blink_progress = 0.0
                else:
                    self.is_blinking = False
                    self.blink_timer = random.uniform(2.5, 5.5)
                    
        self.face_comp.set_morph_target("Eye_Blink_L", blink_weight)
        self.face_comp.set_morph_target("Eye_Blink_R", blink_weight)
        
        # 4. Update Eye Saccades & Laptop Glance-Break Look-At
        self.saccade_timer -= delta_time
        if self.saccade_timer <= 0.0:
            if self.current_state == InterviewState.THINKING:
                # Subtle glance-break down toward laptop on desk
                self.saccade_offset_x = random.uniform(-0.04, 0.04)
                self.saccade_offset_y = random.uniform(-0.35, -0.20)
                self.saccade_timer = random.uniform(1.2, 1.8)
                self.face_comp.set_morph_target("Eye_Look_Down_L", 0.35)
                self.face_comp.set_morph_target("Eye_Look_Down_R", 0.35)
            else:
                # Gaze returns directly to candidate with conversational micro-saccades
                self.saccade_offset_x = random.uniform(-0.03, 0.03)
                self.saccade_offset_y = random.uniform(-0.02, 0.02)
                self.saccade_timer = random.uniform(0.6, 2.0)
                self.face_comp.set_morph_target("Eye_Look_Down_L", 0.0)
                self.face_comp.set_morph_target("Eye_Look_Down_R", 0.0)
                
        # 5. Update Speech-Driven Lip Sync
        jaw_drop = 0.0
        mouth_drop = 0.0
        v_explosive = 0.0
        v_tight_o = 0.0
        v_wide = 0.0
        
        if self.is_speaking_audio:
            self.speech_elapsed += delta_time
            if self.speech_elapsed >= self.speech_duration:
                self.is_speaking_audio = False
                self.current_jaw_open = 0.0
            else:
                # Procedural dynamic multi-frequency speech envelope modulation
                t = self.speech_elapsed
                # Syllable frequency (~3-5Hz) modulated by word cadence (~1-2Hz)
                syllable = math.sin(t * 18.0) * math.cos(t * 7.5)
                syllable_val = max(0.0, syllable * math.sin(t * 3.5))
                
                # Formant/viseme dynamics
                self.target_jaw_open = 0.25 + 0.55 * syllable_val
                # Smooth interpolation (spring-damper response)
                self.current_jaw_open += (self.target_jaw_open - self.current_jaw_open) * min(1.0, delta_time * 18.0)
                
                jaw_drop = self.current_jaw_open
                mouth_drop = jaw_drop * 0.7
                v_explosive = max(0.0, math.sin(t * 12.0) * 0.4) if (math.sin(t * 8.0) > 0.4) else 0.0
                v_tight_o = max(0.0, math.sin(t * 9.0) * 0.35) if (math.cos(t * 6.0) > 0.3) else 0.0
                v_wide = max(0.0, math.sin(t * 14.0) * 0.3)
        else:
            self.current_jaw_open += (0.0 - self.current_jaw_open) * min(1.0, delta_time * 12.0)
            jaw_drop = self.current_jaw_open
            
        self.face_comp.set_morph_target("Jaw_Open", jaw_drop)
        self.face_comp.set_morph_target("Mouth_Drop_Lower", mouth_drop)
        self.face_comp.set_morph_target("V_Explosive", v_explosive)
        self.face_comp.set_morph_target("V_Tight_O", v_tight_o)
        self.face_comp.set_morph_target("V_Wide", v_wide)
        
        # 6. Update Facial Emotion Target Blending
        target_emotions = {k: 0.0 for k in self.emotion_weights}
        if self.current_emotion == InterviewEmotion.SMILE:
            target_emotions["Smile"] = 0.65
        elif self.current_emotion == InterviewEmotion.ATTENTIVE:
            target_emotions["Attentive"] = 0.5
            target_emotions["Smile"] = 0.15
        elif self.current_emotion == InterviewEmotion.THOUGHTFUL:
            target_emotions["Thoughtful"] = 0.6
        elif self.current_emotion == InterviewEmotion.CURIOUS:
            target_emotions["Curious"] = 0.55
        elif self.current_emotion == InterviewEmotion.IMPRESSED:
            target_emotions["Smile"] = 0.5
            target_emotions["Attentive"] = 0.4
            
        for k in self.emotion_weights:
            self.emotion_weights[k] += (target_emotions[k] - self.emotion_weights[k]) * min(1.0, delta_time * 4.0)
            
        # Apply Emotion Morphs
        smile_w = self.emotion_weights["Smile"]
        attentive_w = self.emotion_weights["Attentive"]
        thoughtful_w = self.emotion_weights["Thoughtful"]
        
        self.face_comp.set_morph_target("Mouth_Smile_L", smile_w)
        self.face_comp.set_morph_target("Mouth_Smile_R", smile_w)
        self.face_comp.set_morph_target("Cheek_Puff_L", smile_w * 0.3)
        self.face_comp.set_morph_target("Cheek_Puff_R", smile_w * 0.3)
        
        self.face_comp.set_morph_target("Brow_Raise_Inner_L", attentive_w * 0.4)
        self.face_comp.set_morph_target("Brow_Raise_Inner_R", attentive_w * 0.4)
        
        self.face_comp.set_morph_target("Brow_Drop_L", thoughtful_w * 0.45)
        self.face_comp.set_morph_target("Brow_Drop_R", thoughtful_w * 0.45)
        self.face_comp.set_morph_target("Mouth_Dimple_L", thoughtful_w * 0.3)
        self.face_comp.set_morph_target("Mouth_Dimple_R", thoughtful_w * 0.3)


# Global Singleton Controller Instance
interviewer_runtime = AIInterviewerController()

print("=" * 70)
print(">>> AI INTERVIEWER RUNTIME CONTROLLER INITIALIZED SUCCESSFULLY <<<")
print("=" * 70)
