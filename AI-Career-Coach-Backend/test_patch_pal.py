import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
PAL_ID = "p5277ac17937"

print("======================================================================")
print(f"  TEST PATCHING PAL {PAL_ID}")
print("======================================================================")

with httpx.Client(timeout=30.0) as client:
    headers = {
        "x-api-key": TAVUS_API_KEY,
        "Content-Type": "application/json"
    }

    # 1. Get current PAL
    curr = client.get(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers).json()
    print("Current PAL pipeline_mode:", curr.get("pipeline_mode"))

    # 2. Attempt PATCH with pipeline_mode and transport
    patch_payload = {
        "name": "AI HR Interviewer – Professional",
        "pipeline_mode": "full",  # or echo
    }
    resp = client.patch(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers, json=patch_payload)
    print(f"PATCH Status: {resp.status_code}")
    print(f"PATCH Body: {resp.text}")
