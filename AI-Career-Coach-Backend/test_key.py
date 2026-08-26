import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GOOGLE_API_KEY")

print("Loaded:", key is not None)

if key:
    print("Prefix:", key[:8])
    print("Length:", len(key))
else:
    print("GOOGLE_API_KEY not found.")