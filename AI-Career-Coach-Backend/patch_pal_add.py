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

    # Test patch ops
    patch_ops = [
        {"op": "add", "path": "/name", "value": "AI HR Interviewer – Professional"},
    ]
    resp = client.patch(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers, json=patch_ops)
    print(f"PATCH add /name Status: {resp.status_code}")
    print(f"PATCH add /name Body: {resp.text}")

    # Check PAL details
    pal = client.get(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers).json()
    print(f"\nUpdated PAL {PAL_ID}:")
    print(f"  Name: {pal.get('name')}")
    print(f"  Pipeline Mode: {pal.get('pipeline_mode')}")
    print(f"  Transport: {pal.get('layers', {}).get('transport', {}).get('transport_type')}")
    print(f"  Face: {pal.get('default_face_id') or pal.get('face_id')}")
