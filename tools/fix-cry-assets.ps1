param([string]$Root = "assets\production_character\raster_face_v1")

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$rootPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $Root))
$boardPath = Join-Path $rootPath "source_boards\cute_sparkle.png"
$board = [Drawing.Bitmap]::new($boardPath)

function Save-PaddedEye([Drawing.Bitmap]$source, [Drawing.Rectangle]$region, [string]$target) {
  $minX=$region.Right; $minY=$region.Bottom; $maxX=-1; $maxY=-1
  for($y=$region.Top;$y-lt$region.Bottom;$y++){for($x=$region.Left;$x-lt$region.Right;$x++){
    if($source.GetPixel($x,$y).A -gt 8){$minX=[Math]::Min($minX,$x);$maxX=[Math]::Max($maxX,$x);$minY=[Math]::Min($minY,$y);$maxY=[Math]::Max($maxY,$y)}
  }}
  if($maxX-lt0){throw "No eye artwork in $region"}
  $artW=$maxX-$minX+1; $artH=$maxY-$minY+1
  $pad=[Math]::Max(16,[int][Math]::Ceiling([Math]::Max($artW,$artH)*.15))
  $output=[Drawing.Bitmap]::new($artW+$pad*2,$artH+$pad*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[Drawing.Graphics]::FromImage($output);$g.Clear([Drawing.Color]::Transparent)
  $g.DrawImage($source,[Drawing.Rectangle]::new($pad,$pad,$artW,$artH),[Drawing.Rectangle]::new($minX,$minY,$artW,$artH),[Drawing.GraphicsUnit]::Pixel)
  $g.Dispose();$output.Save($target,[Drawing.Imaging.ImageFormat]::Png);$output.Dispose()
}

$half=[int]($board.Width/2); $eyeRegionHeight=[int]($board.Height*.70)
# The cute board has no brows; each eye is allowed to use the board's full height.
Save-PaddedEye $board ([Drawing.Rectangle]::new(0,0,$half,$eyeRegionHeight)) (Join-Path $rootPath "eyes\cute_sparkle_left.png")
Save-PaddedEye $board ([Drawing.Rectangle]::new($half,0,$board.Width-$half,$eyeRegionHeight)) (Join-Path $rootPath "eyes\cute_sparkle_right.png")
$board.Dispose()

$watery=[Drawing.Bitmap]::new((Join-Path $rootPath "source_boards\watery_sad.png"));$wateryHalf=[int]($watery.Width/2);$wateryEyeHeight=[int]($watery.Height*.64)
Save-PaddedEye $watery ([Drawing.Rectangle]::new(0,0,$wateryHalf,$wateryEyeHeight)) (Join-Path $rootPath "eyes\watery_sad_left.png")
Save-PaddedEye $watery ([Drawing.Rectangle]::new($wateryHalf,0,$watery.Width-$wateryHalf,$wateryEyeHeight)) (Join-Path $rootPath "eyes\watery_sad_right.png")
$watery.Dispose()

$qaRoot=Join-Path $rootPath "qa";[IO.Directory]::CreateDirectory($qaRoot)|Out-Null
$qa=[Drawing.Bitmap]::new(1200,650,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$canvas=[Drawing.Graphics]::FromImage($qa);$canvas.Clear([Drawing.Color]::FromArgb(255,255,52,154))
$pen=[Drawing.Pen]::new([Drawing.Color]::Cyan,5);$font=[Drawing.Font]::new("Segoe UI",28,[Drawing.FontStyle]::Bold)
$left=[Drawing.Image]::FromFile((Join-Path $rootPath "eyes\cute_sparkle_left.png"));$right=[Drawing.Image]::FromFile((Join-Path $rootPath "eyes\cute_sparkle_right.png"))
$canvas.DrawImage($left,80,70,460,500);$canvas.DrawImage($right,660,70,460,500);$canvas.DrawRectangle($pen,80,70,460,500);$canvas.DrawRectangle($pen,660,70,460,500)
$canvas.DrawString("LEFT — 15% SAFE ALPHA MARGIN",$font,[Drawing.Brushes]::White,80,590);$canvas.DrawString("RIGHT — 15% SAFE ALPHA MARGIN",$font,[Drawing.Brushes]::White,660,590)
$left.Dispose();$right.Dispose();$pen.Dispose();$font.Dispose();$canvas.Dispose();$qa.Save((Join-Path $qaRoot "cute_eye_padding_check.png"),[Drawing.Imaging.ImageFormat]::Png);$qa.Dispose()
Write-Host "Rebuilt complete padded cute eyes and QA preview."
