<#
.SYNOPSIS
    safety-gate.ps1 - deterministic (non-LLM) safety gate check

.DESCRIPTION
    Mechanically inspects risky changes before a Tier 1 step is allowed to
    continue. If ANY check hits, the result is BLOCK (= Tier 2, escalate to
    the human gate). If everything is clean, it returns PASS (Tier 1 may go on).

    NOTE: Comments and messages in this file are intentionally ASCII-only.
    Windows PowerShell 5.1 reads BOM-less files using the legacy code page,
    which corrupts multibyte (e.g. Japanese) characters and can break parsing.
    Keeping this script ASCII-only lets it stay UTF-8 (no BOM) / LF and run
    safely on every environment. Human-facing rationale lives in the .md docs.

    What is inspected (working area AND, optionally, committed range):
      - Untracked NEW files        : git ls-files --others --exclude-standard
      - Working area changes        : git status --porcelain (staged+unstaged)
      - Committed changes since the session start : git diff <start>..HEAD
      - Deleted files               : status 'D'
      - Secret/sensitive files      : .env / *.key / *.pem / *secret* / *.db ...
      - lockfile/schema/migration   : dependency or schema changes
      - deploy-chain hints          : CI/deploy config changes

    IMPORTANT (audit-fixed false negatives):
      1) Untracked new files (e.g. a freshly created .env.production, *.key,
         a new deploy workflow, a new migration or lockfile) are NOW inspected.
         The old version only looked at tracked diffs and let new files PASS.
      2) After a commit the working tree is clean, so with the default
         -BaseRef HEAD the gate would see 0 changes and PASS even though the
         commit may contain dangerous files. To inspect committed work you MUST
         pass -SessionStartRef <the HEAD captured when the session began>.
         If the working area is clean AND no -SessionStartRef is given, the
         scope is unknown, so the gate fails safe with BLOCK (exit 1), never
         PASS. Do NOT run a post-commit check with only the default HEAD.

    Real secret VALUES are never handled. Only file names / statuses are read.
    Guarded with try/catch so it does not crash when git is missing.

    Master rules : AI_WORK_RULES.md (sections 3.2 / 3.3 / 5)
    Per-project  : AI_PROJECT_PROFILE.md (6 deploy / 7 DB / 8 secrets)

.PARAMETER RepoPath
    Target repository path. Defaults to the current directory.

.PARAMETER BaseRef
    Compare base for the working-area diff. Default HEAD.

.PARAMETER SessionStartRef
    The commit hash captured at the start of the Codex session. When set, the
    gate also inspects everything committed between this ref and HEAD, so
    post-commit checks cannot slip through. Strongly recommended in automation.

.OUTPUTS
    Prints PASS / BLOCK with reasons.
    Exit code: 0 = PASS, 1 = BLOCK, 2 = cannot inspect (no git etc.; human gate).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/safety-gate.ps1 -RepoPath "C:\path\to\repo" -SessionStartRef $env:CODEX_SESSION_START_SHA
#>

[CmdletBinding()]
param(
    [string] $RepoPath        = ".",
    [string] $BaseRef         = "HEAD",
    [string] $SessionStartRef = "",
    # Large-change thresholds (AI_WORK_RULES.md 3.4 / Profile 10.6).
    # Exceeding these does NOT block; it prints a [LARGE CHANGE] flag so the
    # loop can require rollback pre-check + post-merge notify + LARGE record.
    [int]    $LargeFiles      = 20,
    [int]    $LargeLines      = 400
)

# ---- result container ----------------------------------------------------
$reasons = New-Object System.Collections.Generic.List[string]
$gitAvailable = $true

# ---- risk patterns -------------------------------------------------------
# Secret/sensitive files (name-based; values are never read).
$secretPatterns = @(
    '\.env(\..*)?$',
    '\.key$', '\.pem$', '\.p12$', '\.pfx$',
    'secret', 'credentials',
    '\.db$', '\.sqlite3?$', '\.dump$'
)

# lockfile / schema / migration (dependency / schema changes are Tier 2).
$lockSchemaPatterns = @(
    'package-lock\.json$', 'yarn\.lock$', 'pnpm-lock\.yaml$',
    'composer\.lock$', 'Gemfile\.lock$', 'poetry\.lock$',
    'Pipfile\.lock$', 'requirements\.txt$',
    'Cargo\.lock$', 'go\.mod$', 'go\.sum$',
    'gradle\.lockfile$', '\.csproj$', 'packages\.lock\.json$',
    'schema\.(sql|prisma|rb)$',
    '(^|/)migrations?/', '(^|/)migrate/'
)

# deploy-chain hints (final decision in Profile; here we only detect changes).
$deployHintPatterns = @(
    '(^|/)\.github/workflows/.*\.ya?ml$',
    '(^|/)\.gitlab-ci\.yml$', '(^|/)Jenkinsfile$',
    'Dockerfile$', 'docker-compose.*\.ya?ml$',
    'Procfile$', 'serverless\.ya?ml$',
    'vercel\.json$', 'netlify\.toml$',
    'fly\.toml$', '(^|/)\.deploy', 'render\.ya?ml$'
)

# ---- helper: pattern match -----------------------------------------------
function Test-AnyPattern {
    param([string] $Path, [string[]] $Patterns)
    foreach ($p in $Patterns) {
        if ($Path -match $p) { return $true }
    }
    return $false
}

# ---- run git (does not crash if git is absent) ---------------------------
function Invoke-Git {
    param([string[]] $GitArgs)
    try {
        $out = & git -C $RepoPath @GitArgs 2>$null
        return $out
    }
    catch {
        $script:gitAvailable = $false
        return $null
    }
}

Write-Host "=== safety-gate.ps1 ==="
Write-Host ("Repository      : {0}" -f $RepoPath)
Write-Host ("BaseRef         : {0}" -f $BaseRef)
Write-Host ("SessionStartRef : {0}" -f $(if ($SessionStartRef) { $SessionStartRef } else { "(not set)" }))
Write-Host ""

# ---- check git availability ----------------------------------------------
try {
    $null = & git --version 2>$null
    if ($LASTEXITCODE -ne 0) { $gitAvailable = $false }
}
catch {
    $gitAvailable = $false
}

if (-not $gitAvailable) {
    Write-Host "[CANNOT INSPECT] git not found or failed to run."
    Write-Host "Safe default: do NOT auto-PASS. Route to human confirmation (Tier 2)."
    exit 2
}

# is this a repo?
$insideRepo = Invoke-Git @('rev-parse', '--is-inside-work-tree')
if ($insideRepo -ne 'true') {
    Write-Host "[CANNOT INSPECT] path is not a git repository. Route to human confirmation (Tier 2)."
    exit 2
}

# ---- collect candidate paths ---------------------------------------------
# We gather paths from four sources so nothing slips through:
#   (a) working area  : git status --porcelain  (staged + unstaged + deleted)
#   (b) untracked new : git ls-files --others --exclude-standard
#   (c) committed     : git diff --name-status <SessionStartRef>..HEAD (if set)
# Each candidate is { Path; IsDelete; Source }.
$candidates = New-Object System.Collections.Generic.List[object]
$workingAreaSeen = $false   # did we observe ANY working-area entry?

function Add-Candidate {
    param([string] $Path, [bool] $IsDelete, [string] $Source)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $candidates.Add([pscustomobject]@{ Path = $Path.Trim(); IsDelete = $IsDelete; Source = $Source })
}

# (a) working area via porcelain. Format: "XY path" or "XY old -> new".
try {
    $porc = Invoke-Git @('status', '--porcelain')
    foreach ($line in $porc) {
        if (-not $line -or $line.Trim() -eq '') { continue }
        $workingAreaSeen = $true
        $code = $line.Substring(0, [Math]::Min(2, $line.Length))
        $rest = if ($line.Length -gt 3) { $line.Substring(3) } else { '' }
        # rename/copy: "old -> new" ; take the new path
        if ($rest -match '->') { $rest = ($rest -split '->')[-1] }
        $isDel = ($code -match 'D')
        $isUntracked = ($code -eq '??')
        Add-Candidate -Path $rest -IsDelete:$isDel -Source $(if ($isUntracked) { 'untracked' } else { 'working' })
    }
}
catch {
    $reasons.Add("Failed to read 'git status --porcelain' (safe default: BLOCK)")
}

# (b) explicit untracked listing (belt-and-suspenders; some statuses hide dirs)
try {
    $others = Invoke-Git @('ls-files', '--others', '--exclude-standard')
    foreach ($p in $others) {
        if ($p -and $p.Trim() -ne '') { $workingAreaSeen = $true; Add-Candidate -Path $p -IsDelete:$false -Source 'untracked' }
    }
}
catch { }

# (c) committed range since session start
$committedSeen = $false
if ($SessionStartRef -ne '') {
    try {
        $range = "$SessionStartRef..HEAD"
        $committed = Invoke-Git @('diff', '--name-status', $range)
        foreach ($line in $committed) {
            if (-not $line -or $line.Trim() -eq '') { continue }
            $committedSeen = $true
            $parts = $line -split "`t"
            $status = $parts[0]
            $path = $parts[-1]
            $isDel = ($status -match 'D')
            Add-Candidate -Path $path -IsDelete:$isDel -Source 'committed'
        }
    }
    catch {
        $reasons.Add("Failed to read committed range $SessionStartRef..HEAD (safe default: BLOCK)")
    }
}

# ---- fail-safe: unknown inspection scope ---------------------------------
# After a commit the working area is clean. If we also have no SessionStartRef,
# we genuinely do not know what to inspect -> never PASS by default.
if (-not $workingAreaSeen -and -not $committedSeen) {
    if ($SessionStartRef -eq '') {
        Write-Host "[CANNOT INSPECT] Working area is clean and no -SessionStartRef was given."
        Write-Host "Scope of changes is unknown (a commit may hide dangerous files)."
        Write-Host "Re-run with -SessionStartRef <session-start commit hash> to inspect committed work."
        Write-Host "Safe default: BLOCK (Tier 2 / human gate), not PASS."
        exit 1
    }
}

# ---- match candidates against patterns -----------------------------------
$deletedCount = 0
foreach ($c in $candidates) {
    $path = $c.Path
    if ($c.IsDelete) {
        $deletedCount++
        $reasons.Add("Deleted file ($($c.Source)): $path")
    }
    if (Test-AnyPattern -Path $path -Patterns $secretPatterns) {
        $reasons.Add("Secret/sensitive file ($($c.Source)): $path")
    }
    if (Test-AnyPattern -Path $path -Patterns $lockSchemaPatterns) {
        $reasons.Add("lockfile/schema/migration ($($c.Source)): $path")
    }
    if (Test-AnyPattern -Path $path -Patterns $deployHintPatterns) {
        $reasons.Add("deploy-chain config (confirm in Profile) ($($c.Source)): $path")
    }
}

# ---- large-change flag (informational; does not block) -------------------
# Count distinct candidate paths; optionally count changed lines via numstat.
$distinctFiles = ($candidates | ForEach-Object { $_.Path } | Select-Object -Unique).Count
$changedLines = 0
try {
    $statArgs = @('diff', '--numstat')
    if ($SessionStartRef -ne '') { $statArgs += "$SessionStartRef..HEAD" } else { $statArgs += $BaseRef }
    $numstat = Invoke-Git $statArgs
    foreach ($l in $numstat) {
        if (-not $l) { continue }
        $cols = $l -split "`t"
        # columns: added  deleted  path ; '-' means binary
        if ($cols.Length -ge 2) {
            $add = 0; $del = 0
            [int]::TryParse($cols[0], [ref]$add) | Out-Null
            [int]::TryParse($cols[1], [ref]$del) | Out-Null
            $changedLines += ($add + $del)
        }
    }
}
catch { }

$isLarge = ($distinctFiles -ge $LargeFiles) -or ($changedLines -ge $LargeLines)
if ($isLarge) {
    Write-Host "[LARGE CHANGE] files=$distinctFiles (>= $LargeFiles) or lines=$changedLines (>= $LargeLines)"
    Write-Host "Loop must: verify rollback BEFORE merge, then notify + record LARGE in DECISIONS.md (AI_WORK_RULES.md 3.4)."
    Write-Host ""
}

# ---- verdict -------------------------------------------------------------
Write-Host "--- candidates: $($candidates.Count) (distinct: $distinctFiles / deleted: $deletedCount / lines: $changedLines) ---"
Write-Host ""

if ($reasons.Count -eq 0) {
    Write-Host "RESULT: PASS (Tier 1 may continue)"
    Write-Host "No deletions, no secret files, no lockfile/schema/migration, no deploy-chain hints"
    Write-Host "across working area + untracked + committed range."
    Write-Host "Note: also confirm deploy-chain reality in AI_PROJECT_PROFILE.md section 6."
    exit 0
}
else {
    Write-Host "RESULT: BLOCK (Tier 2 = human gate; kensan approval required)"
    Write-Host "Reasons:"
    foreach ($r in $reasons) {
        Write-Host ("  - {0}" -f $r)
    }
    Write-Host ""
    Write-Host "Action: file a request in APPROVALS.md and set the task to WAITING_APPROVAL."
    exit 1
}
