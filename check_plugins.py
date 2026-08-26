import unreal

print(">>> CHECKING PLUGINS & CAPABILITIES <<<")

# Check available plugins
plugin_subsystem = unreal.get_editor_subsystem(unreal.PluginBrowserEditorSubsystem) if hasattr(unreal, "PluginBrowserEditorSubsystem") else None

# Check HttpBlueprint and JsonBlueprintUtilities
http_bp = unreal.EditorAssetLibrary.load_asset("/Script/HTTPBlueprint")
json_bp = unreal.EditorAssetLibrary.load_asset("/Script/JsonBlueprintUtilities")

print(f"HTTP Blueprint script loaded: {http_bp}")
print(f"JSON Blueprint script loaded: {json_bp}")

# Check WebSockets and AudioCapture
print("Classes available in Unreal:")
test_classes = [
    "HTTPBlueprint",
    "AudioCapture",
    "AudioCaptureComponent",
    "SynthComponent",
    "AudioSynesthesia",
    "ControlRigComponent",
    "SkeletalMeshComponent"
]
for tc in test_classes:
    cls = getattr(unreal, tc, None)
    print(f"  Class {tc}: {cls is not None}")

print(">>> CHECKING COMPLETE <<<")
