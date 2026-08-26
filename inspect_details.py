import unreal

print(">>> DETAILED INSPECTION OF RIGS & MESHES <<<")

# Check MaleInterviewer01
male_asset = unreal.EditorAssetLibrary.load_asset("/Game/MaleInterviewer01")
print(f"MaleInterviewer01: {male_asset}")
if male_asset:
    print("MaleInterviewer01 dir:", [x for x in dir(male_asset) if not x.startswith('_')])

# Check Kevin Body & Face Meshes
body_mesh = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/SK_Kevin_Body")
face_mesh = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/SK_Kevin_Face")
kevin_mesh = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/SK_Kevin")

print(f"SK_Kevin: {kevin_mesh}")
print(f"SK_Kevin_Body: {body_mesh}")
print(f"SK_Kevin_Face: {face_mesh}")

# Check CC_Rig_BP
cc_rig_bp = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/CC_Rig_BP")
print(f"CC_Rig_BP: {cc_rig_bp}")

# Check CC_BodyRig_AB and CC_FaceRig_AB
body_ab = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/CC_BodyRig_AB")
face_ab = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/CC_FaceRig_AB")
print(f"CC_BodyRig_AB: {body_ab}")
print(f"CC_FaceRig_AB: {face_ab}")

# Check CC_Body_Rig and CC_Face_Rig Control Rigs
body_cr = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/CC_Rigs/Controls/CC_Body_Rig")
face_cr = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/CC_Rigs/Controls/CC_Face_Rig")
print(f"CC_Body_Rig: {body_cr}")
print(f"CC_Face_Rig: {face_cr}")

# Inspect Morph targets on Face mesh
if face_mesh:
    morph_targets = face_mesh.get_editor_property("morph_targets") if hasattr(face_mesh, "get_editor_property") else []
    print(f"Face Mesh Morph Targets Count: {len(morph_targets)}")
    morph_names = [m.get_name() for m in morph_targets[:30]]
    print("Sample Morph Targets:", morph_names)

print(">>> DETAILED INSPECTION DONE <<<")
