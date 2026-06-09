$chartsDir = "C:\Users\tony\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075\MQL5\Profiles\Charts\"
Get-ChildItem -Path $chartsDir -Recurse -Filter "*.chr" | ForEach-Object {
    $relativePath = $_.FullName.Substring($chartsDir.Length)
    $writeTime = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "$relativePath : $writeTime"
}
