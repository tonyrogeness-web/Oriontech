$terminalsDir = "C:\Users\tony\AppData\Roaming\MetaQuotes\Terminal\"
Get-ChildItem $terminalsDir | Where-Object { $_.PSIsContainer } | ForEach-Object {
    $dirName = $_.Name
    $originPath = Join-Path $_.FullName "origin.txt"
    if (Test-Path $originPath) {
        $origin = Get-Content $originPath
        Write-Host "$dirName -> $origin"
    }
}
