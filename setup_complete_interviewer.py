import unreal

print("=" * 80)
print(">>> CONFIGURING COMPLETE REALISTIC 3D AI INTERVIEWER ENVIRONMENT IN UE 5.8 <<<")
print("=" * 80)

editor_asset_lib = unreal.EditorAssetLibrary
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

# 1. Load BP_AIInterviewer
bp_interviewer_path = "/Game/Interviewer/Characters/BP_AIInterviewer"
bp_asset = editor_asset_lib.load_asset(bp_interviewer_path)
print(f"Loaded BP_AIInterviewer: {bp_asset}")

# 2. Load and Configure InterviewStudio Level
studio_map_path = "/Game/Interviewer/Maps/InterviewStudio"
print(f"Loading Map: {studio_map_path}")
unreal.EditorLevelLibrary.load_level(studio_map_path)

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
print(f"Total Actors in Level: {len(all_actors)}")

# 3. Helper to find or spawn StaticMeshActor
def spawn_or_get_static_mesh(label, mesh_path, loc, rot, scale):
    for a in all_actors:
        if a.get_actor_label() == label:
            a.set_actor_location_and_rotation(loc, rot, False, False)
            a.set_actor_scale3d(scale)
            return a
    
    mesh_asset = editor_asset_lib.load_asset(mesh_path)
    if not mesh_asset:
        # Fallback to engine basic shape
        mesh_asset = editor_asset_lib.load_asset("/Engine/BasicShapes/Cube")
    
    spawned = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.StaticMeshActor, loc, rot)
    spawned.set_actor_label(label)
    spawned.set_actor_scale3d(scale)
    sm_comp = spawned.get_component_by_class(unreal.StaticMeshComponent)
    if sm_comp and mesh_asset:
        sm_comp.set_static_mesh(mesh_asset)
    return spawned

# 4. Position or Spawn BP_AIInterviewer (Seated behind desk)
interviewer_actor = None
for a in all_actors:
    label = a.get_actor_label()
    c_name = a.get_class().get_name()
    if "BP_AIInterviewer" in c_name or "BP_Rig" in c_name or "CC_Rig" in c_name or "AI_Human_Interviewer" in label:
        interviewer_actor = a
        break

if not interviewer_actor:
    gen_class = bp_asset.generated_class()
    spawn_loc = unreal.Vector(0.0, 0.0, 0.0)
    spawn_rot = unreal.Rotator(0.0, 180.0, 0.0)
    interviewer_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(gen_class, spawn_loc, spawn_rot)
    print(f"Spawned new AI Interviewer actor: {interviewer_actor}")
else:
    print(f"Using existing Interviewer actor: {interviewer_actor.get_actor_label()}")

if interviewer_actor:
    interviewer_actor.set_actor_label("AI_Human_Interviewer")
    interviewer_actor.set_actor_location_and_rotation(unreal.Vector(0.0, 0.0, 0.0), unreal.Rotator(0.0, 180.0, 0.0), False, False)
    print("Placed AI Interviewer seated naturally at (0, 0, 0) facing Camera.")

# 5. Build & Position Executive Interview Desk
# Desk Top Surface at Z=74cm, dimensions: 160cm wide (Y), 80cm deep (X), 4cm thick
desk_top = spawn_or_get_static_mesh(
    "Interview_Executive_Desk_Top",
    "/Engine/BasicShapes/Cube",
    unreal.Vector(45.0, 0.0, 72.0),
    unreal.Rotator(0.0, 0.0, 0.0),
    unreal.Vector(0.8, 1.6, 0.04)
)
print("Configured Executive Interview Desk Top Surface.")

# Desk Left Leg
desk_leg_left = spawn_or_get_static_mesh(
    "Interview_Desk_Leg_Left",
    "/Engine/BasicShapes/Cube",
    unreal.Vector(45.0, -75.0, 36.0),
    unreal.Rotator(0.0, 0.0, 0.0),
    unreal.Vector(0.7, 0.08, 0.72)
)

# Desk Right Leg
desk_leg_right = spawn_or_get_static_mesh(
    "Interview_Desk_Leg_Right",
    "/Engine/BasicShapes/Cube",
    unreal.Vector(45.0, 75.0, 36.0),
    unreal.Rotator(0.0, 0.0, 0.0),
    unreal.Vector(0.7, 0.08, 0.72)
)

# Desk Modesty Panel (Front facing candidate)
desk_panel = spawn_or_get_static_mesh(
    "Interview_Desk_Modesty_Panel",
    "/Engine/BasicShapes/Cube",
    unreal.Vector(78.0, 0.0, 42.0),
    unreal.Rotator(0.0, 0.0, 0.0),
    unreal.Vector(0.04, 1.45, 0.55)
)
print("Configured Executive Desk Structure (Legs and Modesty Panel).")

# 6. Build & Position Open Professional Laptop on Desk
# Laptop Base (Keyboard unit resting on desk at X=42, Y=0, Z=74.5)
laptop_base = spawn_or_get_static_mesh(
    "Interview_Laptop_Base",
    "/Engine/BasicShapes/Cube",
    unreal.Vector(42.0, 0.0, 74.8),
    unreal.Rotator(0.0, 0.0, 0.0),
    unreal.Vector(0.24, 0.34, 0.012)
)

# Laptop Screen (Open at 105 degrees, screen facing interviewer at X=0)
laptop_screen = spawn_or_get_static_mesh(
    "Interview_Laptop_Screen",
    "/Engine/BasicShapes/Cube",
    unreal.Vector(53.0, 0.0, 85.0),
    unreal.Rotator(-15.0, 0.0, 0.0),
    unreal.Vector(0.01, 0.34, 0.22)
)
print("Placed Realistic Open Professional Laptop Prop on Desk facing Interviewer.")

# 7. Position Cinematic Camera (Medium portrait framing: waist/chest upward, desk, laptop, hands, and face)
cam_actor = None
for a in all_actors:
    if "Interview_Cinematic_Camera" in a.get_actor_label() or "CineCamera" in a.get_class().get_name():
        cam_actor = a
        break

cam_loc = unreal.Vector(175.0, 0.0, 132.0)
cam_rot = unreal.Rotator(-2.5, 180.0, 0.0)

if not cam_actor:
    cam_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, cam_loc, cam_rot)
    cam_actor.set_actor_label("Interview_Cinematic_Camera")
    print(f"Spawned Cine Camera: {cam_actor}")
else:
    cam_actor.set_actor_label("Interview_Cinematic_Camera")
    cam_actor.set_actor_location_and_rotation(cam_loc, cam_rot, False, False)
    print("Adjusted Interview Cinematic Camera framing.")

if cam_actor and hasattr(cam_actor, "get_cine_camera_component"):
    cam_comp = cam_actor.get_cine_camera_component()
    if cam_comp:
        cam_comp.current_focal_length = 45.0
        cam_comp.focus_settings.focus_method = unreal.CameraFocusMethod.MANUAL
        cam_comp.focus_settings.manual_focus_distance = 175.0
        print("Configured 45mm Portrait Lens with Depth of Field focused on Interviewer.")

# 8. Setup 3-Point Studio Lighting + Eye Catchlight
def spawn_or_get_light(label, light_cls, loc, rot, intensity, color):
    for a in all_actors:
        if a.get_actor_label() == label:
            a.set_actor_location_and_rotation(loc, rot, False, False)
            return a
    new_l = unreal.EditorLevelLibrary.spawn_actor_from_class(light_cls, loc, rot)
    new_l.set_actor_label(label)
    l_comp = new_l.get_component_by_class(unreal.LightComponent)
    if l_comp:
        l_comp.set_intensity(intensity)
        l_comp.set_light_color(color)
    return new_l

# Warm Key Light
key_light = spawn_or_get_light(
    "Interview_KeyLight",
    unreal.DirectionalLight,
    unreal.Vector(120.0, -100.0, 200.0),
    unreal.Rotator(-25.0, 135.0, 0.0),
    6.0,
    unreal.LinearColor(1.0, 0.96, 0.90, 1.0)
)

# Cool Fill Light
fill_light = spawn_or_get_light(
    "Interview_FillLight",
    unreal.DirectionalLight,
    unreal.Vector(140.0, 110.0, 175.0),
    unreal.Rotator(-15.0, 215.0, 0.0),
    2.5,
    unreal.LinearColor(0.88, 0.94, 1.0, 1.0)
)

# Crisp Rim Light
rim_light = spawn_or_get_light(
    "Interview_RimLight",
    unreal.DirectionalLight,
    unreal.Vector(-100.0, 70.0, 210.0),
    unreal.Rotator(-30.0, 315.0, 0.0),
    5.0,
    unreal.LinearColor(0.95, 0.95, 1.0, 1.0)
)

# Eye Specular Catchlight
catch_light = spawn_or_get_light(
    "Interview_EyeCatchlight",
    unreal.PointLight,
    unreal.Vector(150.0, 0.0, 150.0),
    unreal.Rotator(0, 0, 0),
    500.0,
    unreal.LinearColor(1.0, 1.0, 1.0, 1.0)
)
print("Configured Studio 3-Point Lighting and Specular Catchlight.")

# 9. Save Level
unreal.EditorLevelLibrary.save_current_level()
print("Saved Level successfully!")

print("=" * 80)
print(">>> REALISTIC INTERVIEW DESK & STUDIO SCENE SETUP COMPLETED SUCCESSFULLY! <<<")
print("=" * 80)
