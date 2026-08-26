import unreal
import json

print(">>> INSPECTING UNREAL ASSETS <<<")
asset_reg = unreal.AssetRegistryHelpers.get_asset_registry()

# Find all assets in CC_ControlRig_Sample and Game root
filter = unreal.ARFilter(
    package_paths=["/Game"],
    recursive_paths=True
)

assets = asset_reg.get_assets(filter)
print(f"Total assets found in /Game: {len(assets)}")

skeletal_meshes = []
control_rigs = []
anim_blueprints = []
levels = []
blueprints = []

for a in assets:
    c_name = str(a.asset_class_path.asset_name)
    pkg = str(a.package_name)
    if "SkeletalMesh" in c_name:
        skeletal_meshes.append((pkg, c_name))
    elif "ControlRig" in c_name:
        control_rigs.append((pkg, c_name))
    elif "AnimBlueprint" in c_name:
        anim_blueprints.append((pkg, c_name))
    elif "World" in c_name or "Level" in c_name:
        levels.append((pkg, c_name))
    elif "Blueprint" in c_name:
        blueprints.append((pkg, c_name))

print("\n--- SKELETAL MESHES ---")
for sm in skeletal_meshes:
    print(sm)

print("\n--- CONTROL RIGS ---")
for cr in control_rigs:
    print(cr)

print("\n--- ANIM BLUEPRINTS ---")
for ab in anim_blueprints:
    print(ab)

print("\n--- BLUEPRINTS ---")
for bp in blueprints:
    print(bp)

print("\n--- LEVELS ---")
for lvl in levels:
    print(lvl)

# Also check MaleInterviewer01
male_asset = unreal.EditorAssetLibrary.load_asset("/Game/MaleInterviewer01")
if male_asset:
    print(f"\nMaleInterviewer01 loaded: {type(male_asset)} - {male_asset.get_name()} ({male_asset.get_class().get_name()})")
else:
    print("\nMaleInterviewer01 not loaded or not found as direct asset")

print(">>> INSPECTION COMPLETE <<<")
