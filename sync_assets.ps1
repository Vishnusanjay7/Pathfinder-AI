$src = "C:\Users\vishn\OneDrive\Documents\Unreal Projects\CharacterCreatorKevin\Content\CC_ControlRig_Sample"
$dst = "C:\Users\vishn\OneDrive\Documents\Unreal Projects\AIInterviewer\Content\CC_ControlRig_Sample"

Write-Host "Copying assets from $src to $dst..."
Copy-Item -Path "$src\*" -Destination $dst -Recurse -Force
Write-Host "Asset copy completed."

Get-ChildItem -Path $dst | Select-Object Name
