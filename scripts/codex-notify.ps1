param(
  [ValidateSet("complete", "attention", "blocked", "failed")]
  [string]$Status = "complete",

  [string]$Title = "Codex",

  [string]$Message = "Codex task status changed.",

  [ValidateSet("min", "low", "default", "high", "urgent")]
  [string]$Priority = "default",

  [switch]$NoBeep,

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-CodexBeep {
  param([string]$Kind)

  if ($Kind -eq "complete") {
    [console]::beep(880, 300)
    Start-Sleep -Milliseconds 120
    [console]::beep(1046, 350)
    return
  }

  [console]::beep(523, 350)
  Start-Sleep -Milliseconds 120
  [console]::beep(392, 450)
}

if (-not $NoBeep) {
  Invoke-CodexBeep -Kind $Status
}

$topic = $env:CODEX_NTFY_TOPIC
if ([string]::IsNullOrWhiteSpace($topic)) {
  Write-Output "smartphone notification skipped: CODEX_NTFY_TOPIC is not set"
  exit 0
}

if ($topic -notmatch "^[A-Za-z0-9_-]{8,64}$") {
  Write-Output "smartphone notification skipped: CODEX_NTFY_TOPIC format is invalid"
  exit 0
}

$baseUrl = $env:CODEX_NTFY_BASE_URL
if ([string]::IsNullOrWhiteSpace($baseUrl)) {
  $baseUrl = "https://ntfy.sh"
}

$baseUrl = $baseUrl.TrimEnd("/")
$uri = "$baseUrl/$topic"

$safeBody = @"
status: $Status
message: $Message
"@

if ($DryRun) {
  Write-Output "smartphone notification dry-run: configured"
  exit 0
}

$headers = @{
  Title = $Title
  Priority = $Priority
}

try {
  $null = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "text/plain; charset=utf-8" -Body $safeBody
  Write-Output "smartphone notification sent"
} catch {
  Write-Output "smartphone notification failed"
  exit 0
}
