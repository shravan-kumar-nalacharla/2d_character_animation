param(
  [string]$GeneratedRoot = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757",
  [string]$OutputRoot = "assets\production_character\raster_face_v1"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputRoot))
$folders = @("source_boards", "eyes", "eyebrows", "tears", "face_fx")
foreach ($folder in $folders) { [IO.Directory]::CreateDirectory((Join-Path $root $folder)) | Out-Null }

$boards = @{
  angry_01       = "exec-31eaac0a-21a6-4daf-8691-59444038842d.png"
  angry_squint   = "exec-8d78917e-25c6-4ccd-af72-a9135e6f6d63.png"
  angry_glare    = "exec-ec058258-5757-4108-959f-7db281b99d7b.png"
  annoyed        = "exec-acda1bbd-0850-460c-a3f1-af29cb77c0bb.png"
  cute_sparkle   = "exec-82108073-704a-43b0-aa4f-d52e423d5ce4.png"
  cute_brows     = "exec-340c3fce-9c5e-4671-a7ce-57f376a5f1f3.png"
  watery_sad     = "exec-17a9c451-b9b4-48a9-b3ec-3e2a91c33047.png"
  crying_squeezed= "exec-541b6b99-8bbc-403a-8797-e7ff90290603.png"
  waterfall      = "exec-bda80e66-7fb4-4f2a-8a7f-7732f53f2d6d.png"
  angry_shadow   = "exec-a9dec5c5-efb1-494d-8d8e-94446edc10e9.png"
  anger_symbols  = "exec-cc9fc59a-bf0b-4b2f-b9e4-1e61eab39371.png"
}

function Copy-Board([string]$key) {
  $source = Join-Path $GeneratedRoot $boards[$key]
  if (-not (Test-Path -LiteralPath $source)) { throw "Missing generated board: $source" }
  $target = Join-Path $root "source_boards\$key.png"
  Copy-Item -LiteralPath $source -Destination $target -Force
  return $target
}

function Save-AlphaCrop([System.Drawing.Bitmap]$source, [System.Drawing.Rectangle]$region, [string]$path, [int]$padding = 12, [double]$safeMargin = 0) {
  $minX = $region.Right; $minY = $region.Bottom; $maxX = -1; $maxY = -1
  for ($y = $region.Top; $y -lt $region.Bottom; $y++) {
    for ($x = $region.Left; $x -lt $region.Right; $x++) {
      if ($source.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { throw "No visible pixels in $path" }
  $left = [Math]::Max($region.Left, $minX - $padding); $top = [Math]::Max($region.Top, $minY - $padding)
  $right = [Math]::Min($region.Right - 1, $maxX + $padding); $bottom = [Math]::Min($region.Bottom - 1, $maxY + $padding)
  $crop = [System.Drawing.Rectangle]::new($left, $top, $right - $left + 1, $bottom - $top + 1)
  $extra = if ($safeMargin -gt 0) { [int][Math]::Ceiling([Math]::Max($crop.Width, $crop.Height) * $safeMargin) } else { 0 }
  $result = [System.Drawing.Bitmap]::new($crop.Width + $extra * 2, $crop.Height + $extra * 2, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($result)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($source, [System.Drawing.Rectangle]::new($extra, $extra, $crop.Width, $crop.Height), $crop, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  $result.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $result.Dispose()
}

function Split-FaceBoard([string]$key, [bool]$browsOnTop = $false, [bool]$skipBrows = $false) {
  $path = Copy-Board $key; $bmp = [System.Drawing.Bitmap]::new($path)
  if (($bmp.PixelFormat -band [System.Drawing.Imaging.PixelFormat]::Alpha) -eq 0) { throw "$key has no alpha channel" }
  $halfW = [int]($bmp.Width / 2); $halfH = [int]($bmp.Height / 2)
  $eyeY = if ($browsOnTop) { $halfH } else { 0 }; $browY = if ($browsOnTop) { 0 } else { $halfH }
  Save-AlphaCrop $bmp ([System.Drawing.Rectangle]::new(0, $eyeY, $halfW, $halfH)) (Join-Path $root "eyes\${key}_left.png")
  Save-AlphaCrop $bmp ([System.Drawing.Rectangle]::new($halfW, $eyeY, $bmp.Width - $halfW, $halfH)) (Join-Path $root "eyes\${key}_right.png")
  if (-not $skipBrows) {
    Save-AlphaCrop $bmp ([System.Drawing.Rectangle]::new(0, $browY, $halfW, $halfH)) (Join-Path $root "eyebrows\${key}_left.png")
    Save-AlphaCrop $bmp ([System.Drawing.Rectangle]::new($halfW, $browY, $bmp.Width - $halfW, $halfH)) (Join-Path $root "eyebrows\${key}_right.png")
  }
  $bmp.Dispose()
}

foreach ($key in @("angry_01", "angry_squint", "angry_glare", "annoyed", "watery_sad")) { Split-FaceBoard $key }
# Cute eyes cross the board midpoint, so they are rebuilt from full-height halves
# with a proportional safe margin by tools/fix-cry-assets.ps1.
Split-FaceBoard "cute_sparkle" $false $true
$cuteBrowPath = Copy-Board "cute_brows"; $cuteBrows = [System.Drawing.Bitmap]::new($cuteBrowPath); $cuteHalf = [int]($cuteBrows.Width / 2)
Save-AlphaCrop $cuteBrows ([System.Drawing.Rectangle]::new(0, 0, $cuteHalf, $cuteBrows.Height)) (Join-Path $root "eyebrows\cute_sparkle_left.png")
Save-AlphaCrop $cuteBrows ([System.Drawing.Rectangle]::new($cuteHalf, 0, $cuteBrows.Width - $cuteHalf, $cuteBrows.Height)) (Join-Path $root "eyebrows\cute_sparkle_right.png")
$cuteBrows.Dispose()
Split-FaceBoard "crying_squeezed" $true

$waterfallPath = Copy-Board "waterfall"; $waterfall = [System.Drawing.Bitmap]::new($waterfallPath); $waterfallHalf = [int]($waterfall.Width / 2)
Save-AlphaCrop $waterfall ([System.Drawing.Rectangle]::new(0, 0, $waterfallHalf, $waterfall.Height)) (Join-Path $root "tears\waterfall_left.png") 8
Save-AlphaCrop $waterfall ([System.Drawing.Rectangle]::new($waterfallHalf, 0, $waterfall.Width - $waterfallHalf, $waterfall.Height)) (Join-Path $root "tears\waterfall_right.png") 8
$waterfall.Dispose()

$shadowPath = Copy-Board "angry_shadow"; $shadow = [System.Drawing.Bitmap]::new($shadowPath)
Save-AlphaCrop $shadow ([System.Drawing.Rectangle]::new(0, 0, $shadow.Width, $shadow.Height)) (Join-Path $root "face_fx\angry_shadow.png") 10
$shadow.Dispose()

$symbolPath = Copy-Board "anger_symbols"; $symbols = [System.Drawing.Bitmap]::new($symbolPath); $third = [int]($symbols.Width / 3)
Save-AlphaCrop $symbols ([System.Drawing.Rectangle]::new(0, 0, $third, $symbols.Height)) (Join-Path $root "face_fx\anger_cross_01.png") 8
Save-AlphaCrop $symbols ([System.Drawing.Rectangle]::new($third, 0, $third, $symbols.Height)) (Join-Path $root "face_fx\anger_cross_02.png") 8
Save-AlphaCrop $symbols ([System.Drawing.Rectangle]::new($third * 2, 0, $symbols.Width - $third * 2, $symbols.Height)) (Join-Path $root "face_fx\anger_vein_01.png") 8
$symbols.Dispose()

Write-Host "Raster face pack built at $root"
