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

    # Test patch pipeline_mode to echo
    patch_ops = [
        {"op": "replace", "path": "/pipeline_mode", "value": "echo"},
    ]
    resp = client.patch(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers, json=patch_ops)
    print(f"PATCH pipeline_mode Status: {resp.status_code}")
    print(f"PATCH pipeline_mode Body: {resp.text}")

    pal = client.get(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers).json()
    print(f"\nUpdated PAL {PAL_ID}:")
    print(f"  Pipeline Mode: {pal.get('pipeline_mode')}")
