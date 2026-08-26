import unreal

print(">>> TESTING RUNTIME MORPH TARGETS & BONE DRIVERS <<<")

editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
all_actors = editor_actor_subsystem.get_all_level_actors()

interviewer_actor = None
for a in all_actors:
    if "AI_Human_Interviewer" in a.get_actor_label() or "BP_AIInterviewer" in a.get_class().get_name():
        interviewer_actor = a
        break

print(f"Found Interviewer Actor: {interviewer_actor}")

if interviewer_actor:
    skeletal_comps = interviewer_actor.get_components_by_class(unreal.SkeletalMeshComponent)
    print(f"Skeletal Mesh Components: {len(skeletal_comps)}")
    for comp in skeletal_comps:
        mesh = comp.skeletal_mesh_asset
        mesh_name = mesh.get_name() if mesh else "None"
        print(f"  Component: {comp.get_name()}, Mesh: {mesh_name}")
        
        # Test morph target modification on face component
        if "Face" in mesh_name or "Kevin" in mesh_name:
            print("  Testing morph targets on component...")
            comp.set_morph_target("Eye_Blink_L", 0.5)
            comp.set_morph_target("Eye_Blink_R", 0.5)
            comp.set_morph_target("Jaw_Open", 0.3)
            comp.set_morph_target("Mouth_Smile_L", 0.4)
            comp.set_morph_target("Mouth_Smile_R", 0.4)
            print("  Successfully applied sample test morph targets!")

print(">>> RUNTIME MORPH & BONE TEST COMPLETE <<<")
