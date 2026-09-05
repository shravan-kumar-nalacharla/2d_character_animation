param(
  [string]$OutputRoot = "assets\production_character\raster_face_v1\shadow_candidates",
  [switch]$ContactSheetOnly
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputRoot))
$rawRoot = Join-Path $root "raw"
[IO.Directory]::CreateDirectory($rawRoot) | Out-Null

$sourcePath = Join-Path $root "canonical_head.png"
$raw = [ordered]@{
  A = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757\exec-78467b45-5e2d-46e5-8037-e6836ec1ba3d.png"
  B = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757\exec-8879f06c-b051-4dad-a7b8-cc7c43133aba.png"
  C = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757\exec-a54325e8-c83f-472f-82ad-7eb0f04e7041.png"
  D = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757\exec-a1df7eff-8e2d-4bfe-926d-3f12e29b15ca.png"
  E = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757\exec-2dc712e6-d272-4d2e-8686-47bb69a769c7.png"
  F = "C:\Users\shrav\.codex\generated_images\01a04c34-1401-7d33-967e-8047e7d81757\exec-99ab3e2b-87b8-4729-a812-657948b094ac.png"
}
$settings = @{
  A = @{ FadeStart=.42; FadeEnd=.68; Strength=.94; Tint=8;  Asymmetry=0.00 }
  B = @{ FadeStart=.52; FadeEnd=.76; Strength=.98; Tint=3;  Asymmetry=0.00 }
  C = @{ FadeStart=.34; FadeEnd=.62; Strength=.90; Tint=12; Asymmetry=0.00 }
  D = @{ FadeStart=.45; FadeEnd=.72; Strength=.95; Tint=7;  Asymmetry=0.10 }
  E = @{ FadeStart=.46; FadeEnd=.66; Strength=.97; Tint=5;  Asymmetry=0.00 }
  F = @{ FadeStart=.52; FadeEnd=.82; Strength=.96; Tint=5;  Asymmetry=0.00 }
}

function Color-Distance([System.Drawing.Color]$a, [System.Drawing.Color]$b) {
  return [Math]::Abs($a.R-$b.R)+[Math]::Abs($a.G-$b.G)+[Math]::Abs($a.B-$b.B)
}

function Foreground-Box([System.Drawing.Bitmap]$bitmap) {
  $background = $bitmap.GetPixel($bitmap.Width-1, 0)
  $minX=$bitmap.Width; $minY=$bitmap.Height; $maxX=-1; $maxY=-1
  for($y=0;$y -lt $bitmap.Height;$y+=2){ for($x=0;$x -lt $bitmap.Width;$x+=2){
    if((Color-Distance $bitmap.GetPixel($x,$y) $background) -gt 70){
      if($x -lt $minX){$minX=$x}; if($x -gt $maxX){$maxX=$x}; if($y -lt $minY){$minY=$y}; if($y -gt $maxY){$maxY=$y}
    }
  }}
  if($maxX -lt 0){throw "Could not locate head foreground"}
  return [Drawing.Rectangle]::new($minX,$minY,$maxX-$minX+1,$maxY-$minY+1)
}

function Is-Skin([System.Drawing.Color]$pixel) {
  return $pixel.R -gt 205 -and $pixel.G -gt 150 -and $pixel.G -lt 235 -and $pixel.B -gt 90 -and $pixel.B -lt 205
}

function Smooth-Step([double]$edge0,[double]$edge1,[double]$value) {
  $t=[Math]::Max(0,[Math]::Min(1,($value-$edge0)/($edge1-$edge0)))
  return $t*$t*(3-2*$t)
}

$source = [Drawing.Bitmap]::new($sourcePath)
$sourceBox = Foreground-Box $source
$spans = @{}
$faceTop=$source.Height; $faceBottom=0
$scanLeft=[int]($sourceBox.Left+$sourceBox.Width*.18); $scanRight=[int]($sourceBox.Left+$sourceBox.Width*.82)
for($y=$sourceBox.Top;$y -lt $sourceBox.Bottom;$y++){
  $runs=@(); $start=-1
  for($x=$scanLeft;$x -le $scanRight;$x++){
    $skin=Is-Skin $source.GetPixel($x,$y)
    if($skin -and $start -lt 0){$start=$x}
    if(((-not $skin) -or $x -eq $scanRight) -and $start -ge 0){$end=if($skin){$x}else{$x-1}; if($end-$start -gt 20){$runs+=,[Drawing.Rectangle]::new($start,$y,$end-$start+1,1)}; $start=-1}
  }
  if($runs.Count){
    $left=($runs|Measure-Object Left -Minimum).Minimum
    $right=($runs|ForEach-Object{$_.Right}|Measure-Object -Maximum).Maximum
    $spans[$y]=[Drawing.Rectangle]::new($left,$y,$right-$left,1)
    if($y -lt $faceTop){$faceTop=$y}; if($y -gt $faceBottom){$faceBottom=$y}
  }
}

if(-not $ContactSheetOnly){ foreach($entry in $raw.GetEnumerator()){
  $setting=$settings[$entry.Key]
  if(-not(Test-Path -LiteralPath $entry.Value)){throw "Missing candidate $($entry.Value)"}
  Copy-Item -LiteralPath $entry.Value -Destination (Join-Path $rawRoot "candidate_$($entry.Key.ToLower()).png") -Force
  $generated=[Drawing.Bitmap]::new($entry.Value); $generatedBox=Foreground-Box $generated
  $result=[Drawing.Bitmap]::new($source.Width,$source.Height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[Drawing.Graphics]::FromImage($result); $g.DrawImageUnscaled($source,0,0); $g.Dispose()
  for($y=$faceTop;$y -le $faceBottom;$y++){
    if(-not $spans.ContainsKey($y)){continue}; $span=$spans[$y]
    $t=($y-$faceTop)/[double]([Math]::Max(1,$faceBottom-$faceTop))
    $maskAlpha=1-(Smooth-Step $setting.FadeStart $setting.FadeEnd $t)
    if($maskAlpha -le 0){continue}
    for($x=$span.Left;$x -lt $span.Right;$x++){
      $u=($x-$sourceBox.Left)/[double]$sourceBox.Width; $v=($y-$sourceBox.Top)/[double]$sourceBox.Height
      $gx=[Math]::Max(0,[Math]::Min($generated.Width-1,[int]($generatedBox.Left+$u*$generatedBox.Width)))
      $gy=[Math]::Max(0,[Math]::Min($generated.Height-1,[int]($generatedBox.Top+$v*$generatedBox.Height)))
      $a=$source.GetPixel($x,$y)
      # Preserve the original black line art and hair exactly. Pale eye whites are
      # intentionally shaded so the eyes disappear beneath the anger shadow.
      if(($a.R+$a.G+$a.B) -lt 150){continue}
      $b=$generated.GetPixel($gx,$gy)
      $generatedTone=($b.R+$b.G+$b.B)/3.0
      $target=[Math]::Min(28,$setting.Tint+$generatedTone*.055)
      $horizontal=($x-$span.Left)/[double]([Math]::Max(1,$span.Width))-.5
      $mix=[Math]::Max(0,[Math]::Min(1,$maskAlpha*$setting.Strength*(1+$horizontal*$setting.Asymmetry)))
      $result.SetPixel($x,$y,[Drawing.Color]::FromArgb(255,[int]($a.R*(1-$mix)+$target*$mix),[int]($a.G*(1-$mix)+$target*$mix),[int]($a.B*(1-$mix)+($target+2)*$mix)))
    }
  }
  $result.Save((Join-Path $root "candidate_$($entry.Key.ToLower()).png"),[Drawing.Imaging.ImageFormat]::Png)
  $result.Dispose(); $generated.Dispose()
} }

$referencePath="C:\Users\shrav\AppData\Local\Temp\codex-clipboard-e5088e54-02a9-497f-be9a-83feaac94dae.png"
$items = @(
  [pscustomobject]@{Label="ORIGINAL"; Path=$sourcePath},
  [pscustomobject]@{Label="REFERENCE"; Path=$referencePath},
  [pscustomobject]@{Label="CANDIDATE A"; Path=(Join-Path $root "candidate_a.png")},
  [pscustomobject]@{Label="CANDIDATE B"; Path=(Join-Path $root "candidate_b.png")},
  [pscustomobject]@{Label="CANDIDATE C"; Path=(Join-Path $root "candidate_c.png")},
  [pscustomobject]@{Label="CANDIDATE D"; Path=(Join-Path $root "candidate_d.png")},
  [pscustomobject]@{Label="CANDIDATE E"; Path=(Join-Path $root "candidate_e.png")},
  [pscustomobject]@{Label="CANDIDATE F"; Path=(Join-Path $root "candidate_f.png")}
)
$cellW=448; $cellH=560; $sheet=[Drawing.Bitmap]::new($cellW*4,$cellH*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$canvas=[Drawing.Graphics]::FromImage($sheet); $canvas.Clear([Drawing.Color]::FromArgb(18,22,28)); $canvas.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font=[Drawing.Font]::new("Segoe UI",18,[Drawing.FontStyle]::Bold); $brush=[Drawing.Brushes]::White
for($i=0;$i -lt $items.Count;$i++){
  $x=($i%4)*$cellW; $y=[int]($i/4)*$cellH; $image=[Drawing.Image]::FromFile($items[$i].Path)
  $availableH=$cellH-48; $scale=[Math]::Min(($cellW-16)/$image.Width,($availableH-8)/$image.Height); $w=[int]($image.Width*$scale); $h=[int]($image.Height*$scale)
  $canvas.DrawImage($image,$x+[int](($cellW-$w)/2),$y+8,$w,$h); $canvas.DrawString($items[$i].Label,$font,$brush,$x+12,$y+$cellH-38); $image.Dispose()
}
$sheet.Save((Join-Path $root "angry_shadow_composite_candidates.png"),[Drawing.Imaging.ImageFormat]::Png)
$font.Dispose(); $canvas.Dispose(); $sheet.Dispose(); $source.Dispose()
Write-Host "Built six controlled full-head candidates and contact sheet at $root"
