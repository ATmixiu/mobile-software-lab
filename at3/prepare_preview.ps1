Add-Type -AssemblyName System.Drawing

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ImagesDir = Join-Path $ProjectRoot "images"

$TimeStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ParentDir = Split-Path $ProjectRoot -Parent
$BackupDir = Join-Path $ParentDir ("AT3_image_backup_" + $TimeStamp)

$ProtectedFiles = @(
    "index.png",
    "index_blue.png",
    "my.png",
    "my_blue.png"
)

Write-Host ""
Write-Host "========================================"
Write-Host " AT3 image optimizer"
Write-Host "========================================"
Write-Host ""
Write-Host "Project:"
Write-Host $ProjectRoot
Write-Host ""
Write-Host "Images:"
Write-Host $ImagesDir
Write-Host ""
Write-Host "Backup:"
Write-Host $BackupDir
Write-Host ""

if (!(Test-Path $ImagesDir)) {
    Write-Host "ERROR: images folder was not found."
    exit 1
}

New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

Copy-Item `
    -Path (Join-Path $ImagesDir "*") `
    -Destination $BackupDir `
    -Recurse `
    -Force

Write-Host "Backup complete."
Write-Host ""


function Get-JpegEncoder {

    $Encoders = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()

    foreach ($Encoder in $Encoders) {

        if ($Encoder.MimeType -eq "image/jpeg") {
            return $Encoder
        }

    }

    return $null
}


function Compress-OneImage {

    param(
        [string]$Path,
        [int]$MaxSide,
        [int]$Quality
    )

    $Extension = [System.IO.Path]::GetExtension($Path).ToLower()

    if (
        $Extension -ne ".jpg" -and
        $Extension -ne ".jpeg" -and
        $Extension -ne ".png"
    ) {
        return
    }

    $OriginalFile = Get-Item $Path
    $OriginalBytes = $OriginalFile.Length

    $Image = $null
    $Bitmap = $null
    $Graphics = $null
    $EncoderParameters = $null
    $TempFile = $null

    try {

        $Image = [System.Drawing.Image]::FromFile($Path)

        $Width = $Image.Width
        $Height = $Image.Height

        $Scale = 1.0

        if ($Width -gt $MaxSide -or $Height -gt $MaxSide) {

            if ($Width -ge $Height) {
                $Scale = $MaxSide / [double]$Width
            }
            else {
                $Scale = $MaxSide / [double]$Height
            }

        }

        $NewWidth = [Math]::Max(
            1,
            [int][Math]::Round($Width * $Scale)
        )

        $NewHeight = [Math]::Max(
            1,
            [int][Math]::Round($Height * $Scale)
        )

        $Bitmap = New-Object System.Drawing.Bitmap -ArgumentList $NewWidth, $NewHeight

        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)

        $Graphics.InterpolationMode =
            [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

        $Graphics.SmoothingMode =
            [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $Graphics.PixelOffsetMode =
            [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $Graphics.CompositingQuality =
            [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        if ($Extension -ne ".png") {
            $Graphics.Clear([System.Drawing.Color]::White)
        }

        $Graphics.DrawImage(
            $Image,
            0,
            0,
            $NewWidth,
            $NewHeight
        )

        if ($Extension -eq ".png") {

            $TempFile = $Path + ".tmp.png"

            $Bitmap.Save(
                $TempFile,
                [System.Drawing.Imaging.ImageFormat]::Png
            )

        }
        else {

            $TempFile = $Path + ".tmp.jpg"

            $JpegEncoder = Get-JpegEncoder

            $EncoderParameters =
                New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1

            $EncoderParameters.Param[0] =
                New-Object System.Drawing.Imaging.EncoderParameter `
                    -ArgumentList `
                    ([System.Drawing.Imaging.Encoder]::Quality),
                    ([long]$Quality)

            $Bitmap.Save(
                $TempFile,
                $JpegEncoder,
                $EncoderParameters
            )

        }

        $Graphics.Dispose()
        $Graphics = $null

        $Bitmap.Dispose()
        $Bitmap = $null

        $Image.Dispose()
        $Image = $null

        if ($EncoderParameters) {
            $EncoderParameters.Dispose()
            $EncoderParameters = $null
        }

        if (Test-Path $TempFile) {

            $NewBytes = (Get-Item $TempFile).Length

            if ($NewBytes -lt $OriginalBytes) {

                Move-Item `
                    -Path $TempFile `
                    -Destination $Path `
                    -Force

            }
            else {

                Remove-Item $TempFile -Force

            }

        }

    }
    catch {

        Write-Host "FAILED:"
        Write-Host $Path
        Write-Host $_.Exception.Message

        if ($TempFile -and (Test-Path $TempFile)) {
            Remove-Item $TempFile -Force
        }

    }
    finally {

        if ($Graphics) {
            $Graphics.Dispose()
        }

        if ($Bitmap) {
            $Bitmap.Dispose()
        }

        if ($Image) {
            $Image.Dispose()
        }

        if ($EncoderParameters) {
            $EncoderParameters.Dispose()
        }

    }

}


function Get-OptimizableImages {

    param(
        [string]$Folder
    )

    return Get-ChildItem $Folder -File | Where-Object {

        $Extension = $_.Extension.ToLower()

        $IsImage =
            $Extension -eq ".jpg" -or
            $Extension -eq ".jpeg" -or
            $Extension -eq ".png"

        $IsProtected =
            $ProtectedFiles -contains $_.Name

        $IsImage -and !$IsProtected
    }
}


function Get-FolderSizeMB {

    param(
        [string]$Folder
    )

    $Value = (
        Get-ChildItem $Folder -File -Recurse |
        Measure-Object Length -Sum
    ).Sum

    if ($null -eq $Value) {
        return 0
    }

    return [Math]::Round($Value / 1MB, 2)
}


function Run-CompressionPass {

    param(
        [int]$MaxSide,
        [int]$Quality
    )

    $Files = Get-OptimizableImages $ImagesDir

    foreach ($File in $Files) {

        $BeforeKB = [Math]::Round(
            $File.Length / 1KB,
            1
        )

        Compress-OneImage `
            -Path $File.FullName `
            -MaxSide $MaxSide `
            -Quality $Quality

        $AfterFile = Get-Item $File.FullName

        $AfterKB = [Math]::Round(
            $AfterFile.Length / 1KB,
            1
        )

        Write-Host $File.Name
        Write-Host ("    " + $BeforeKB + " KB -> " + $AfterKB + " KB")
    }
}


Write-Host "PASS 1"
Write-Host "Max side: 720 px"
Write-Host "JPEG quality: 48"
Write-Host ""

Run-CompressionPass `
    -MaxSide 720 `
    -Quality 48

$ImagesSizeMB = Get-FolderSizeMB $ImagesDir

Write-Host ""
Write-Host ("Images size after pass 1: " + $ImagesSizeMB + " MB")
Write-Host ""


if ($ImagesSizeMB -gt 1.30) {

    Write-Host "PASS 2"
    Write-Host "Max side: 560 px"
    Write-Host "JPEG quality: 38"
    Write-Host ""

    Run-CompressionPass `
        -MaxSide 560 `
        -Quality 38

    $ImagesSizeMB = Get-FolderSizeMB $ImagesDir

    Write-Host ""
    Write-Host ("Images size after pass 2: " + $ImagesSizeMB + " MB")
    Write-Host ""

}


if ($ImagesSizeMB -gt 1.15) {

    Write-Host "PASS 3"
    Write-Host "Max side: 480 px"
    Write-Host "JPEG quality: 32"
    Write-Host ""

    Run-CompressionPass `
        -MaxSide 480 `
        -Quality 32

    $ImagesSizeMB = Get-FolderSizeMB $ImagesDir

    Write-Host ""
    Write-Host ("Images size after pass 3: " + $ImagesSizeMB + " MB")
    Write-Host ""

}


$ProjectSizeMB = Get-FolderSizeMB $ProjectRoot


Write-Host ""
Write-Host "========================================"
Write-Host " FINISHED"
Write-Host "========================================"
Write-Host ""

Write-Host "Backup folder:"
Write-Host $BackupDir
Write-Host ""

Write-Host ("Current images size: " + $ImagesSizeMB + " MB")
Write-Host ("Current project size: " + $ProjectSizeMB + " MB")
Write-Host ""

Write-Host "No images were deleted."
Write-Host "No image filenames were changed."
Write-Host "Original images are stored in the backup folder."
Write-Host ""

if ($ProjectSizeMB -lt 1.90) {

    Write-Host "RESULT: PASS"
    Write-Host "Try WeChat Preview / Device Debug now."

}
else {

    Write-Host "RESULT: STILL_LARGE"
    Write-Host "Send the final size to ChatGPT."

}

Write-Host ""