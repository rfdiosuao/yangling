$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectDir = Split-Path $PSScriptRoot -Parent
$brand = [System.Drawing.Image]::FromFile((Join-Path $projectDir 'src/assets/seal-logo.png'))
function Save-BrandIcon([string]$RelativePath, [int]$Size, [double]$Scale = 1) {
  $bitmap = New-Object System.Drawing.Bitmap $Size,$Size
  $canvas = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $canvas.Clear([System.Drawing.Color]::Transparent)
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $edge = [int]($Size * $Scale)
    $offset = [int](($Size - $edge) / 2)
    $canvas.DrawImage($brand, $offset, $offset, $edge, $edge)
    $bitmap.Save((Join-Path $projectDir $RelativePath), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $canvas.Dispose(); $bitmap.Dispose() }
}
try {
  foreach ($size in @(180,192,512)) { Save-BrandIcon "public/icons/icon-$size.png" $size }
  foreach ($entry in @(@('mdpi',48,108),@('hdpi',72,162),@('xhdpi',96,216),@('xxhdpi',144,324),@('xxxhdpi',192,432))) {
    $dir = "android/app/src/main/res/mipmap-$($entry[0])"
    Save-BrandIcon "$dir/ic_launcher.png" $entry[1]
    Save-BrandIcon "$dir/ic_launcher_round.png" $entry[1]
    Save-BrandIcon "$dir/ic_launcher_foreground.png" $entry[2] 0.62
  }
} finally { $brand.Dispose() }
