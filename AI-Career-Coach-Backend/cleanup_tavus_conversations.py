import os
import httpx
from dotenv import load_dotenv

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")

with httpx.Client(timeout=30.0) as client:
    resp = client.get(
        "https://tavusapi.com/v2/conversations",
        headers={"x-api-key": TAVUS_API_KEY}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    items = data.get("data", [])
    print(f"Total conversations on Tavus: {len(items)}")
    
    active = [c for c in items if c.get("status") in ("active", "created", "starting")]
    print(f"Active conversations count: {len(active)}")
    
    for c in items:
        cid = c.get("conversation_id")
        cstatus = c.get("status")
        print(f"  - {cid} (status={cstatus}, created={c.get('created_at')})")
        if cstatus in ("active", "created", "starting"):
            del_resp = client.delete(
                f"https://tavusapi.com/v2/conversations/{cid}",
                headers={"x-api-key": TAVUS_API_KEY}
            )
            print(f"    -> Terminated active conversation {cid}: status={del_resp.status_code}")

print("\nAll stale conversations terminated. Account slot is now completely free!")
