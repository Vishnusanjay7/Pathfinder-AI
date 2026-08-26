import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
PAL_ID = "p5277ac17937"
FACE_ID = "r3f427f43c9d"

print("======================================================================")
print("  TAVUS PAL & FACE DIAGNOSTIC")
print("======================================================================")

with httpx.Client(timeout=30.0) as client:
    headers = {"x-api-key": TAVUS_API_KEY}
    
    # 1. Inspect PAL
    print(f"\n[1] Querying PAL {PAL_ID}...")
    pal_resp = client.get(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=headers)
    print(f"Status: {pal_resp.status_code}")
    if pal_resp.status_code == 200:
        pal_data = pal_resp.json()
        print("PAL Details (Sanitized):")
        print(f"  Name: {pal_data.get('name')}")
        print(f"  PAL ID: {pal_data.get('pal_id')}")
        print(f"  Face ID: {pal_data.get('face_id') or pal_data.get('default_face_id')}")
        print(f"  Pipeline Mode: {pal_data.get('pipeline_mode')}")
        print(f"  Transport: {pal_data.get('transport') or pal_data.get('layers', {}).get('transport')}")
        print(f"  Layers: {json.dumps(pal_data.get('layers', {}), indent=4)}")
    else:
        print(f"PAL Error: {pal_resp.text}")

    # 2. Inspect Faces
    print(f"\n[2] Querying Face {FACE_ID} / Replicas...")
    face_resp = client.get("https://tavusapi.com/v2/replicas", headers=headers)
    print(f"Replicas Status: {face_resp.status_code}")
    if face_resp.status_code == 200:
        replicas = face_resp.json().get("data", [])
        print(f"Total Replicas: {len(replicas)}")
        target_face = next((r for r in replicas if r.get("replica_id") == FACE_ID), None)
        if target_face:
            print(f"  Found Face {FACE_ID}: {target_face.get('replica_name')}, status={target_face.get('status')}")
        else:
            print(f"  Face {FACE_ID} not in replicas list. Showing replicas:")
            for r in replicas[:5]:
                print(f"    - {r.get('replica_id')}: {r.get('replica_name')} ({r.get('status')})")
    else:
        print(f"Replicas Error: {face_resp.text}")
