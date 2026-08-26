import unreal

print(">>> INITIALIZING INTERVIEWER ASSET CREATION <<<")

editor_asset_lib = unreal.EditorAssetLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

# Ensure directories exist
directories = [
    "/Game/Interviewer",
    "/Game/Interviewer/Characters",
    "/Game/Interviewer/Animation",
    "/Game/Interviewer/ControlRig",
    "/Game/Interviewer/Blueprints",
    "/Game/Interviewer/Audio",
    "/Game/Interviewer/UI",
    "/Game/Interviewer/Maps",
]

for d in directories:
    if not editor_asset_lib.does_directory_exist(d):
        editor_asset_lib.make_directory(d)
        print(f"Created directory: {d}")
    else:
        print(f"Directory exists: {d}")

print(">>> DIRECTORIES INITIALIZED <<<")
