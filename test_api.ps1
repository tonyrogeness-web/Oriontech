$body = @{
    token = "aura_secret_token_123456"
    account = "163086425"
    balance = 10000.0
    equity = 10000.0
    dailyProfit = 0.0
    floatingPl = 0.0
    totalProfit = 0.0
    maxDrawdown = 0.0
    status = "RUNNING"
    trades = @(
        @{
            ticket = "12345678"
            symbol = "EURUSD"
            type = "BUY"
            volume = 0.01
            entryPrice = 1.08500
            currentPrice = 1.08600
            currentProfit = 1.00
            magicNumber = 88800
        }
    )
    history = @(
        @{
            date = "2026.06.09"
            profit = 12.50
            balance = 10012.50
        }
    )
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://oriontech-mu.vercel.app/api/mt5/update" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Success:"
    $response | ConvertTo-Json
} catch {
    Write-Host "Error status code:" $_.Exception.Response.StatusCode.Value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body:" $responseBody
}
