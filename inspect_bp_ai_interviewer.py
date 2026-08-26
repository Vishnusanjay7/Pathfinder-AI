import unreal

print(">>> INSPECTING BP_AIINTERVIEWER <<<")
bp = unreal.EditorAssetLibrary.load_asset("/Game/Interviewer/Characters/BP_AIInterviewer")
print(f"Loaded BP: {bp}")

gen_class = bp.generated_class()
cdo = unreal.get_default_object(gen_class)
print(f"CDO: {cdo}")

# Inspect all components in BP SimpleConstructionScript
scs = bp.get_editor_property("simple_construction_script") if hasattr(bp, "get_editor_property") else None
if scs:
    all_nodes = scs.get_all_nodes()
    print(f"SCS Nodes count: {len(all_nodes)}")
    for node in all_nodes:
        comp_tmpl = node.get_editor_property("component_template")
        var_name = node.get_editor_property("internal_variable_name_token")
        print(f"  Node: {var_name} -> {comp_tmpl.get_class().get_name() if comp_tmpl else 'None'}")

# Inspect variables / properties on CDO
for p in dir(cdo):
    if not p.startswith("_") and not p.startswith("call_") and not p.startswith("get_") and not p.startswith("set_"):
        try:
            val = getattr(cdo, p)
            if not callable(val):
                print(f"  Prop: {p} = {val}")
        except Exception:
            pass

print(">>> INSPECTION COMPLETE <<<")
