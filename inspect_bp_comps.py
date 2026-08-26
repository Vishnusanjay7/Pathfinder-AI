import unreal

print(">>> INSPECTING CC_RIG_BP & BP_RIG <<<")

cc_rig_bp = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/CC_Rig_BP")
bp_rig = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/RLContent/Kevin/Rig/BP_Rig")

def inspect_bp(bp_asset, name):
    print(f"\n--- Blueprint: {name} ---")
    if not bp_asset:
        print("Asset not found!")
        return
    gen_class = bp_asset.generated_class()
    print(f"Generated Class: {gen_class}")
    cdo = unreal.get_default_object(gen_class)
    print(f"CDO: {cdo}")
    
    # Check components
    if hasattr(bp_asset, "subobject_data_subsystem"):
        pass
    
    # Check actor components on CDO or blueprint
    if hasattr(cdo, "get_components_by_class"):
        comps = cdo.get_components_by_class(unreal.ActorComponent)
        print(f"CDO Components count: {len(comps)}")
        for c in comps:
            print(f"  Component: {c.get_name()} ({c.get_class().get_name()})")

inspect_bp(cc_rig_bp, "CC_Rig_BP")
inspect_bp(bp_rig, "BP_Rig")

# Also inspect DemoRoom
bp_demoroom = unreal.EditorAssetLibrary.load_asset("/Game/CC_ControlRig_Sample/DemoRoom/Blueprints/BP_DemoRoom")
inspect_bp(bp_demoroom, "BP_DemoRoom")

print(">>> INSPECTION COMPLETE <<<")
