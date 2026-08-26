import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
DRAFT_ID = "pd1e71cde61f"

with httpx.Client(timeout=30.0) as client:
    headers = {"x-api-key": TAVUS_API_KEY, "Content-Type": "application/json"}
    
    # Inspect Draft PAL
    print(f"Querying Draft PAL {DRAFT_ID}...")
    resp = client.get(f"https://tavusapi.com/v2/pals/{DRAFT_ID}", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        d = resp.json()
        print("Draft Details:")
        print(f"  Name: {d.get('name')}")
        print(f"  Pipeline Mode: {d.get('pipeline_mode')}")
        print(f"  Face: {d.get('face_id') or d.get('default_face_id')}")
        print(f"  Layers: {json.dumps(d.get('layers', {}), indent=2)}")

    # Check if there is a publish endpoint
    pub_resp = client.post(f"https://tavusapi.com/v2/pals/{DRAFT_ID}/publish", headers=headers)
    print(f"Publish status: {pub_resp.status_code}, body: {pub_resp.text}")
