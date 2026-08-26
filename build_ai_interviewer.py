import unreal

print("=" * 60)
print(">>> STARTING FULL AI INTERVIEWER BUILD & SETUP <<<")
print("=" * 60)

editor_asset_lib = unreal.EditorAssetLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

# 1. Ensure all directories exist
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

# 2. Create BP_AIInterviewer by duplicating CC_Rig_BP (preserving all mesh bindings, materials, rigs, and wrinkle maps)
source_bp = "/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/CC_Rig_BP"
target_bp = "/Game/Interviewer/Characters/BP_AIInterviewer"

if editor_asset_lib.does_asset_exist(source_bp):
    if not editor_asset_lib.does_asset_exist(target_bp):
        duplicated = editor_asset_lib.duplicate_asset(source_bp, target_bp)
        print(f"Successfully duplicated {source_bp} -> {target_bp}: {duplicated is not None}")
    else:
        print(f"Target BP already exists at {target_bp}")
else:
    print(f"Warning: Source BP {source_bp} not found!")

# 3. Create Studio Map / Level
studio_map_path = "/Game/Interviewer/Maps/InterviewStudio"
source_map = "/Game/CC_ControlRig_Sample/Maps/Overview"

if not editor_asset_lib.does_asset_exist(studio_map_path):
    if editor_asset_lib.does_asset_exist(source_map):
        duplicated_map = editor_asset_lib.duplicate_asset(source_map, studio_map_path)
        print(f"Created InterviewStudio level from {source_map}: {duplicated_map is not None}")
    else:
        world_factory = unreal.WorldFactory()
        pkg_name, asset_name = studio_map_path.rsplit("/", 1)
        new_world = asset_tools.create_asset(asset_name, pkg_name, unreal.World, world_factory)
        print(f"Created new world asset: {studio_map_path}")
else:
    print(f"World asset already exists: {studio_map_path}")

# 4. Save all modified assets
editor_asset_lib.save_directory("/Game/Interviewer", only_if_is_dirty=False, recursive=True)
print("Saved /Game/Interviewer directory assets.")

print("=" * 60)
print(">>> INITIAL ASSET SETUP COMPLETED SUCCESSFULLY <<<")
print("=" * 60)
