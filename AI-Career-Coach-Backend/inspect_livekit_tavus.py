import inspect
from livekit.plugins import tavus

print("======================================================================")
print("  LIVEKIT PLUGINS TAVUS SOURCE INSPECTION")
print("======================================================================")
print("Module file:", tavus.__file__)

if hasattr(tavus, "AvatarSession"):
    print("\n--- AvatarSession source ---")
    print(inspect.getsource(tavus.AvatarSession))
elif hasattr(tavus, "avatar"):
    print("\n--- tavus.avatar source ---")
    print(inspect.getsource(tavus.avatar))
else:
    print("Members of tavus:", dir(tavus))
