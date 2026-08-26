import re

ini_path = r"C:\Users\vishn\OneDrive\Documents\Unreal Projects\AIInterviewer\Config\DefaultEngine.ini"

with open(ini_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update GameMapsSettings
if "[/Script/EngineSettings.GameMapsSettings]" in content:
    content = re.sub(
        r"\[/Script/EngineSettings\.GameMapsSettings\][^\[]*",
        "[/Script/EngineSettings.GameMapsSettings]\nEditorStartupMap=/Game/Interviewer/Maps/InterviewStudio\nGameDefaultMap=/Game/Interviewer/Maps/InterviewStudio\nTransitionMap=\nGlobalDefaultGameMode=\n",
        content
    )
else:
    content += "\n[/Script/EngineSettings.GameMapsSettings]\nEditorStartupMap=/Game/Interviewer/Maps/InterviewStudio\nGameDefaultMap=/Game/Interviewer/Maps/InterviewStudio\nTransitionMap=\nGlobalDefaultGameMode=\n"

with open(ini_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated DefaultEngine.ini with default map: /Game/Interviewer/Maps/InterviewStudio")
