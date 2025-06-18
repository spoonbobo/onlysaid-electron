# start-app.ps1 - Kill port 4343 processes and start the application

param(
    [Parameter(Mandatory=$false)]
    [int]$Port = 1212
)

Write-Host "=== Starting Application Setup ===" -ForegroundColor Cyan
Write-Host "Checking for processes using port $Port..." -ForegroundColor Yellow

# Get processes using the specified port
$netstatOutput = netstat -ano | Select-String ":$Port "

if ($netstatOutput) {
    Write-Host "Found processes using port ${Port}:" -ForegroundColor Red
    
    # Extract PIDs from netstat output
    $processIds = @()
    foreach ($line in $netstatOutput) {
        # Split the line and get the last column (PID)
        $columns = $line.ToString().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        $processId = $columns[-1]
        
        # Only add unique PIDs
        if ($processId -match '^\d+$' -and $processIds -notcontains $processId) {
            $processIds += $processId
        }
    }
    
    # Kill each process
    foreach ($processId in $processIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Killing process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
                taskkill /PID $processId /F
                Write-Host "Successfully killed PID $processId" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "Failed to kill PID ${processId}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Wait a moment for processes to fully terminate
    Start-Sleep -Seconds 2
} else {
    Write-Host "No processes found using port $Port" -ForegroundColor Green
}

Write-Host "Port cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "=== Starting Application ===" -ForegroundColor Cyan

try {
    # Run the npm start command
    npm run start
}
catch {
    Write-Host "Error starting application: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}