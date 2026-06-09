Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$wshell = New-Object -ComObject wscript.shell;
$wshell.AppActivate('MetaTrader 5');
Start-Sleep -Seconds 1;

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("C:\Users\tony\.gemini\antigravity-ide\brain\f54fd6b7-f51c-4daf-b46d-255ee1f3c51f\mt5_current.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved successfully!"
