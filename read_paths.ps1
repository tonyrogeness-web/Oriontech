$chartsDir = "C:\Users\tony\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075\MQL5\Profiles\Charts\Default\"
Get-ChildItem (Join-Path $chartsDir "chart*.chr") | ForEach-Object {
    $chartName = $_.Name
    $pathLine = Get-Content $_.FullName -Encoding Unicode | Where-Object { $_ -like "*path=*" }
    Write-Host "$chartName : $pathLine"
}
