import inspect
from livekit.plugins.tavus import AvatarSession, api

print("AvatarSession.start signature:", inspect.signature(AvatarSession.start))
print("AvatarSession.wait_for_join signature:", inspect.signature(AvatarSession.wait_for_join))
print("AvatarSession.aclose signature:", inspect.signature(AvatarSession.aclose))

import livekit.plugins.tavus.avatar as avatar_mod
print("\nAvatar module source snippet:")
lines, start = inspect.getsourcelines(AvatarSession.start)
print("".join(lines[:40]))

lines_join, _ = inspect.getsourcelines(AvatarSession.wait_for_join)
print("\nwait_for_join snippet:")
print("".join(lines_join))
