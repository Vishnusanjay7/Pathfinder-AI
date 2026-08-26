import unreal

print(">>> CHECKING LEVEL FUNCTIONS <<<")
print("EditorLevelLibrary functions:", [x for x in dir(unreal.EditorLevelLibrary) if 'level' in x.lower() or 'map' in x.lower() or 'actor' in x.lower()])
print("LevelEditorSubsystem functions:", [x for x in dir(unreal.LevelEditorSubsystem) if not x.startswith('_')])
