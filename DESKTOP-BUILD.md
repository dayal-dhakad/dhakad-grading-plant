# Windows Desktop Build Guide

The Dhakad Grading Plant desktop application is a thin Electron shell for:

```text
https://app.rcpexim.com
```

It does not contain a separate database or offline copy of the application. Most frontend and
backend changes become available automatically after deployment to the VPS and do not require a new
desktop installer.

Create a new desktop installer when changing:

- Electron main or preload code
- Desktop security or navigation behavior
- Desktop icons, shortcuts, or installer settings
- The production URL or offline screen
- Electron or Electron Builder versions

## 1. Requirements

Build the Windows installer on a Windows development computer with:

- Node.js 22 LTS
- npm 10 or newer
- Git
- The repository and npm dependencies installed

From PowerShell, enter the repository root:

```powershell
cd C:\dhakad-grading-plant
```

Confirm the location and repository state:

```powershell
Get-Location
git status
git branch --show-current
```

Review every uncommitted file before packaging. Never include `.env`, `.env.production`, database
dumps, API keys, or passwords in a commit or installer.

## 2. Install dependencies

For a clean checkout or after dependency changes:

```powershell
npm ci
```

If dependencies are already current and `package-lock.json` has not changed, this step can be
skipped.

## 3. Update the desktop version

Open:

```text
apps/desktop/package.json
```

Change the `version` value before distributing a new desktop release. For example:

```json
{
  "version": "0.1.1"
}
```

Use semantic versions:

- Patch: `0.1.0` → `0.1.1` for fixes
- Minor: `0.1.0` → `0.2.0` for backward-compatible desktop features
- Major: `0.1.0` → `1.0.0` for a stable major release or incompatible change

Do not reuse a version number for a different installer. The version becomes part of the filename
and Windows installation metadata.

## 4. Verify the repository

Run the applicable checks before packaging:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Do not distribute an installer when any required check fails.

## 5. Build the Windows installer

From the repository root:

```powershell
npm run package -w @dhakad/desktop
```

The command:

1. Compiles the Electron main and preload processes.
2. Packages the application for 64-bit Windows.
3. Applies the Dhakad application icon.
4. Includes the offline fallback page.
5. Creates an NSIS installer with desktop and Start-menu shortcuts.

The output is written to:

```text
apps/desktop/release
```

For version `0.1.1`, the installer filename is:

```text
Dhakad-Grading-Plant-Setup-0.1.1.exe
```

The `release` directory is intentionally ignored by Git. Do not commit generated installers.

## 6. Test the installer

Before sending it to the client, install it on a clean Windows computer or Windows user profile.

Verify:

- The installer completes successfully.
- The Dhakad logo appears on the installer, executable, taskbar, desktop shortcut, and Start menu.
- Only one application instance opens.
- Login at `app.rcpexim.com` works.
- Customers, grading, seed sales, payments, reports, and printing work as applicable.
- External HTTPS links open in the default browser.
- Disconnecting the internet displays the offline screen.
- Selecting **Try again** reconnects after internet access returns.
- Uninstalling from Windows Settings removes the application and shortcuts.

The desktop app requires internet access. Business data remains on the production VPS.

## 7. Generate a checksum

Generate a SHA-256 checksum for the exact installer being distributed:

```powershell
$installer = Get-ChildItem `
  C:\dhakad-grading-plant\apps\desktop\release\Dhakad-Grading-Plant-Setup-*.exe |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256
```

Save the installer filename, version, Git commit, creation date, and SHA-256 value with the release
record.

Confirm the source commit:

```powershell
git rev-parse HEAD
git log -1 --oneline
```

## 8. Distribute the installer

The installer is approximately 100 MB, so upload it to a trusted private Google Drive, OneDrive, or
other controlled download location. Share read-only access with the intended client.

Share these details with it:

- Exact installer filename and version
- SHA-256 checksum
- Production URL: `https://app.rcpexim.com`
- Confirmation that internet access is required
- Installation instructions

The installer is currently unsigned. Windows SmartScreen may display **Windows protected your PC**.
Until trusted Windows code signing is configured, the user may need to select **More info** and then
**Run anyway**. Only instruct the client to do this for an installer received through the approved
channel with a matching SHA-256 checksum.

## 9. Future updates

Automatic desktop updates are not currently configured.

- Web/frontend/backend-only changes: deploy them to the VPS; no new desktop installer is needed.
- Electron/installer changes: increase the desktop version, rebuild, test, and send the new installer.

The client can normally run the newer installer over the existing installation. Confirm the
installed version afterward in Windows Settings under **Installed apps**.

## 10. Common problems

### Packaging fails after a dependency change

```powershell
npm ci
npm run typecheck -w @dhakad/desktop
npm run package -w @dhakad/desktop
```

### The old icon remains after installation

Uninstall the previous desktop version, remove old desktop/Start-menu shortcuts, and install the new
version. Windows may cache application icons temporarily.

### The application shows the offline screen

Check:

```powershell
Test-NetConnection app.rcpexim.com -Port 443
```

Also verify in a browser:

```text
https://app.rcpexim.com/api/v1/health
```

If the browser also fails, inspect the VPS containers, backend logs, gateway logs, DNS, and TLS
certificate using `PRODUCTION-RUNBOOK.md`.

### Windows SmartScreen warning

This is expected for an unsigned installer. The long-term solution is a trusted Windows code-signing
certificate; rebuilding alone does not remove the warning.
