import json

uproject_path = r"C:\Users\vishn\OneDrive\Documents\Unreal Projects\AIInterviewer\AIInterviewer.uproject"

with open(uproject_path, "r", encoding="utf-8") as f:
    data = json.load(f)

plugins = [
    {"Name": "ModelingToolsEditorMode", "Enabled": True, "TargetAllowList": ["Editor"]},
    {"Name": "MetaHumanCharacter", "Enabled": True},
    {"Name": "ControlRig", "Enabled": True},
    {"Name": "PythonScriptPlugin", "Enabled": True},
    {"Name": "LiveLink", "Enabled": True},
    {"Name": "LiveLinkControlRig", "Enabled": True},
]

data["Plugins"] = plugins

with open(uproject_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)

print("Updated uproject plugins to safe valid set successfully!")
