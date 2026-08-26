import unreal

print(">>> CHECKING FACTORIES & TOOLS <<<")

factory_classes = [
    "BlueprintFactory",
    "WidgetBlueprintFactory",
    "AnimBlueprintFactory",
    "WorldFactory",
    "MaterialFactoryNew"
]

for fc in factory_classes:
    cls = getattr(unreal, fc, None)
    print(f"Factory {fc}: {cls is not None}")

# Check subobject data subsystem / blueprint editing
sods = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem) if hasattr(unreal, "SubobjectDataSubsystem") else None
print(f"SubobjectDataSubsystem: {sods is not None}")

print(">>> FACTORIES CHECK COMPLETED <<<")
