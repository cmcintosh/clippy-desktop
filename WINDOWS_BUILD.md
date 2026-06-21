# Building Clippy Desktop on Windows

This guide covers building Clippy Desktop on native Windows (not WSL).

## Prerequisites

1. **Node.js 20+**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version` should show v20.x.x or higher

2. **Git for Windows**
   - Download from [git-scm.com](https://git-scm.com/download/win)
   - Or use `git` command if already installed

3. **Optional: Visual Studio Build Tools**
   - Only needed if building native modules
   - Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

## Step 1: Clone the Repository

Open **Command Prompt** or **PowerShell** (not WSL):

```cmd
cd C:\Users\%USERNAME%\Documents
git clone https://github.com/cmcintosh/clippy-desktop.git
cd clippy-desktop
```

Or download the ZIP and extract it.

## Step 2: Install Dependencies

```cmd
npm install
```

This will download all required packages. It may take a few minutes.

## Step 3: Configure Environment

Create a `.env` file:

```cmd
copy .env.example .env
```

Edit `.env` with Notepad:

```
# OpenClaw Gateway Configuration
OPENCLAW_WS_URL=ws://localhost:18789
OPENCLAW_API_KEY=your_openclaw_api_key_here

# Development
NODE_ENV=production
```

## Step 4: Build the Application

### Development Mode (for testing)

```cmd
npm run dev
```

This starts the app in development mode with hot reloading.

### Production Build (packaged app)

```cmd
npm run package
```

This creates a portable version in `out/ClippyDesktop-win32-x64/`.

You can run it directly:
```cmd
out\ClippyDesktop-win32-x64\ClippyDesktop.exe
```

### Full Installer (.exe setup file)

```cmd
npm run make
```

This creates a Windows installer in:
```
out\make\squirrel.windows\x64\
  - ClippyDesktopSetup.exe      ← Run this to install
  - ClippyDesktop-x.x.x-full.nupkg
```

## Step 5: Install and Run

### Portable Version

1. Navigate to `out\ClippyDesktop-win32-x64\`
2. Double-click `ClippyDesktop.exe`
3. The app will appear as a system tray icon

### Installed Version

1. Run `ClippyDesktopSetup.exe`
2. Follow the installation wizard
3. Clippy will be available in Start Menu
4. Launch from Start Menu or desktop shortcut

## Troubleshooting

### "Cannot find module 'electron-squirrel-startup'"

```cmd
npm install electron-squirrel-startup
npm run make
```

### "node-gyp" build errors

Install Visual Studio Build Tools with C++ workload, then:
```cmd
npm config set msvs_version 2022
npm install
```

### Windows Defender SmartScreen warning

The app is unsigned, so Windows may show a warning. Click "More info" then "Run anyway".

To avoid this, you'd need a code signing certificate (expensive).

### App doesn't connect to OpenClaw

1. Check OpenClaw is running:
   ```cmd
   openclaw gateway status
   ```
   
2. Verify the port in `.env` matches your OpenClaw port

3. Windows Firewall may block the connection - allow ClippyDesktop.exe

## Building for Distribution

To create a release package:

```cmd
npm version patch  # or minor, major
npm run make
```

This creates:
- `out/make/squirrel.windows/x64/ClippyDesktopSetup.exe` (installer)
- `out/make/squirrel.windows/x64/ClippyDesktop-x.x.x-full.nupkg` (update package)

## Additional Build Options

### Build for specific architecture

```cmd
# 64-bit only (default)
npm run make -- --arch=x64

# 32-bit (if needed)
npm run make -- --arch=ia32

# Both
npm run make -- --arch=ia32,x64
```

### Create portable ZIP only

```cmd
npm run package
```

Output: `out/ClippyDesktop-win32-x64/` (portable folder)

## Quick Reference

| Command | What it does |
|---------|--------------|
| `npm install` | Download dependencies |
| `npm run dev` | Run in development mode |
| `npm run build` | Build for production |
| `npm run package` | Create portable app |
| `npm run make` | Create installer (.exe) |
| `npm run publish` | Publish to GitHub releases |

## Need Help?

See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) for known issues and fixes.
