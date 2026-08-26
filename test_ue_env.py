import unreal
print("=" * 50)
print("UNREAL ENGINE VERSION:", unreal.SystemLibrary.get_engine_version())
print("PROJECT DIRECTORY:", unreal.Paths.project_dir())
print("PROJECT CONTENT DIRECTORY:", unreal.Paths.project_content_dir())

# List loaded assets
asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
print("ASSET REGISTRY LOADED")
print("=" * 50)
