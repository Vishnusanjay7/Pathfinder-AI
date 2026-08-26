import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
PAL_ID = "p5277ac17937"

with httpx.Client(timeout=30.0) as client:
    headers = {
        "x-api-key": TAVUS_API_KEY,
        "Content-Type": "application/json"
    }

    # Test patch pipeline_mode to echo with system_prompt empty
    patch_ops = [
        {"op": "replace", "path": "/pipeline_mode", "value": "echo"},
        {"op": "replace", "path": "/system_prompt", "value": ""},
        {"op": "replace", "path": "/greeting", "value": ""},
    ]
    resp = client.patch(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers, json=patch_ops)
    print(f"PATCH pipeline_mode -> echo Status: {resp.status_code}")
    print(f"PATCH Body: {resp.text}")

    pal = client.get(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers).json()
    print(f"\nUpdated PAL {PAL_ID}:")
    print(f"  Pipeline Mode: {pal.get('pipeline_mode')}")
    print(f"  System Prompt: '{pal.get('system_prompt')}'")
    print(f"  Face: {pal.get('default_face_id') or pal.get('face_id')}")
