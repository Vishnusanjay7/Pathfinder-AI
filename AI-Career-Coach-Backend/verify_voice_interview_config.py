import os
import sys
import time
import json
import requests
from dotenv import load_dotenv

# Ensure app is importable
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

results = {
    "env_vars": {},
    "config_loading": {},
    "openrouter": {},
    "livekit": {},
    "deepgram": {},
    "interview_generation": {}
}

# 1. Inspect Backend Environment
vars_to_check = [
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "DEEPGRAM_API_KEY"
]

for var in vars_to_check:
    val = os.getenv(var)
    if val is None:
        results["env_vars"][var] = "MISSING"
    elif val.strip() == "":
        results["env_vars"][var] = "EMPTY"
    else:
        # Check basic format
        if var == "OPENROUTER_API_KEY" and not val.startswith("sk-or-v1-") and not val.startswith("sk-"):
            results["env_vars"][var] = "INVALID FORMAT"
        elif var == "LIVEKIT_URL" and not (val.startswith("http://") or val.startswith("https://") or val.startswith("wss://") or val.startswith("ws://")):
            results["env_vars"][var] = "INVALID FORMAT"
        else:
            results["env_vars"][var] = "CONFIGURED"

# 2. Verify Config Loading in App
try:
    from app.core.config import settings
    results["config_loading"]["settings_loaded"] = True
    results["config_loading"]["openrouter_model_loaded"] = bool(settings.OPENROUTER_MODEL)
    results["config_loading"]["livekit_url_loaded"] = bool(settings.LIVEKIT_URL)
    results["config_loading"]["livekit_key_loaded"] = bool(settings.LIVEKIT_API_KEY)
    results["config_loading"]["livekit_secret_loaded"] = bool(settings.LIVEKIT_API_SECRET)
    results["config_loading"]["deepgram_key_loaded"] = bool(settings.DEEPGRAM_API_KEY)
except Exception as e:
    results["config_loading"]["error"] = str(e)

# 3. Verify OpenRouter
openrouter_key = os.getenv("OPENROUTER_API_KEY")
openrouter_model = os.getenv("OPENROUTER_MODEL", "openrouter/free")

if not openrouter_key:
    results["openrouter"] = {
        "status": "FAIL",
        "authentication": "MISSING_KEY",
        "model": openrouter_model,
        "latency_ms": 0,
        "error": "OPENROUTER_API_KEY is not configured."
    }
else:
    t0 = time.time()
    try:
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Career Coach Verification"
        }
        payload = {
            "model": openrouter_model,
            "messages": [
                {"role": "system", "content": "You are a concise test responder. Respond with only JSON: {\"status\": \"ok\"}"},
                {"role": "user", "content": "ping"}
            ],
            "max_tokens": 20
        }
        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15)
        latency = int((time.time() - t0) * 1000)
        
        if resp.status_code == 200:
            data = resp.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            results["openrouter"] = {
                "status": "PASS",
                "authentication": "PASS",
                "model": data.get("model", openrouter_model),
                "latency_ms": latency,
                "response_received": True,
                "error": None
            }
        else:
            results["openrouter"] = {
                "status": "FAIL",
                "authentication": "FAIL",
                "model": openrouter_model,
                "latency_ms": latency,
                "response_received": False,
                "error": f"HTTP {resp.status_code}: {resp.text[:120]}"
            }
    except Exception as e:
        results["openrouter"] = {
            "status": "FAIL",
            "authentication": "EXCEPTION",
            "model": openrouter_model,
            "latency_ms": int((time.time() - t0) * 1000),
            "error": str(e)
        }

# 4. Verify LiveKit Token Generation & Service
try:
    from app.services.livekit_service import livekit_service
    t0 = time.time()
    session = livekit_service.create_session("qa_verify_room", "candidate_qa_test")
    latency = int((time.time() - t0) * 1000)
    is_cfg = livekit_service.is_configured()
    results["livekit"] = {
        "status": "PASS" if session.get("success") else "FAIL",
        "authentication": "PASS" if is_cfg else "DEV_FALLBACK_ACTIVE",
        "token_generation": "PASS" if bool(session.get("token")) else "FAIL",
        "provider_mode": session.get("provider"),
        "latency_ms": latency,
        "is_configured": is_cfg,
        "error": None
    }
except Exception as e:
    results["livekit"] = {
        "status": "FAIL",
        "authentication": "FAIL",
        "token_generation": "FAIL",
        "latency_ms": 0,
        "error": str(e)
    }

# 5. Verify Deepgram
deepgram_key = os.getenv("DEEPGRAM_API_KEY")
if not deepgram_key or deepgram_key.strip() == "":
    results["deepgram"] = {
        "status": "NOT_CONFIGURED",
        "authentication": "MISSING_KEY",
        "stt_availability": "FALLBACK_TO_BROWSER_SPEECH_RECOGNITION",
        "latency_ms": 0,
        "error": "DEEPGRAM_API_KEY is not configured in backend .env. Fallback to Web Speech API & manual text input is active."
    }
else:
    t0 = time.time()
    try:
        headers = {"Authorization": f"Token {deepgram_key}"}
        resp = requests.get("https://api.deepgram.com/v1/projects", headers=headers, timeout=10)
        latency = int((time.time() - t0) * 1000)
        if resp.status_code == 200:
            results["deepgram"] = {
                "status": "PASS",
                "authentication": "PASS",
                "stt_availability": "CONFIGURED",
                "latency_ms": latency,
                "error": None
            }
        else:
            results["deepgram"] = {
                "status": "FAIL",
                "authentication": "FAIL",
                "stt_availability": "UNAVAILABLE",
                "latency_ms": latency,
                "error": f"HTTP {resp.status_code}: {resp.text[:120]}"
            }
    except Exception as e:
        results["deepgram"] = {
            "status": "FAIL",
            "authentication": "EXCEPTION",
            "stt_availability": "UNAVAILABLE",
            "latency_ms": int((time.time() - t0) * 1000),
            "error": str(e)
        }

# 6. Verify Existing OpenRouter Interview Question Generation
try:
    from app.services.interview_service import interview_service
    t0 = time.time()
    q_res = interview_service.generate_personalized_questions(
        role="Software Engineer",
        interview_type="Technical",
        difficulty="Intermediate",
        count=1,
        skills=["Python", "React", "SQL"],
        projects=[{"title": "Real-Time Chat"}],
        experience=[{"title": "Software Intern"}],
        weak_topics=[],
        company="Microsoft",
        job_title="Software Engineer"
    )
    latency = int((time.time() - t0) * 1000)
    if q_res and len(q_res) > 0 and "question" in q_res[0]:
        results["interview_generation"] = {
            "status": "PASS",
            "question_count": len(q_res),
            "sample_question_preview": q_res[0]["question"][:120] + "...",
            "question_type": q_res[0].get("question_type", "HR"),
            "latency_ms": latency,
            "error": None
        }
    else:
        results["interview_generation"] = {
            "status": "FAIL",
            "latency_ms": latency,
            "error": "No valid structured question returned."
        }
except Exception as e:
    results["interview_generation"] = {
        "status": "FAIL",
        "latency_ms": 0,
        "error": str(e)
    }

print(json.dumps(results, indent=2))
