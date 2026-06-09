$chartsDir = "C:\Users\tony\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075\MQL5\Profiles\Charts\Default\"
Get-ChildItem (Join-Path $chartsDir "chart*.chr") | ForEach-Object {
    $path = $_.FullName
    Write-Host "Updating chart file: $path"
    $content = Get-Content $path -Encoding Unicode
    $newContent = $content -replace "Orion_U2_V3_30_Hedge.ex5", "Orion_Hedge.ex5"
    $newContent | Set-Content $path -Encoding Unicode
}
Write-Host "All chart files updated successfully!"
