# Clippy Desktop Companion

An AI-powered desktop pet with 3D animations, voice interaction, and system automation. Connects to OpenClaw for intelligent conversation and task automation.

## ⚠️ Important Build Notes

This project has been updated with critical fixes. Make sure to:
1. Use the latest code from `main` branch
2. Run `npm install` after pulling updates
3. See [WINDOWS_BUILD.md](WINDOWS_BUILD.md) for Windows-specific instructions

## Features

- 🤖 **AI Integration** — Connects to OpenClaw WebSocket gateway for intelligent responses
- 🎙️ **Voice Control** — Speech-to-text and text-to-speech
- 🔄 **Auto-Reconnection** — Automatically reconnects if connection drops
- ⚡ **System Automation** — Launch apps, keyboard shortcuts, window management
- 🖥️ **Cross-Platform** — Windows, macOS, Linux

## Quick Start

### Prerequisites

- Node.js 20+
- OpenClaw gateway running locally

### Install

```bash
git clone https://github.com/cmcintosh/clippy-desktop.git
cd clippy-desktop
npm install
```

### Configure

Copy `.env.example` to `.env` and set your OpenClaw URL:

```env
OPENCLAW_WS_URL=ws://localhost:18789
```

### Run

Development mode:
```bash
npm run dev
```

Build for your platform:
```bash
npm run make
```

## Building on Windows

**For detailed Windows instructions, see [WINDOWS_BUILD.md](WINDOWS_BUILD.md)**

Quick Windows build:
```cmd
npm install
npm run make
```

Output: `out/make/squirrel.windows/x64/ClippyDesktopSetup.exe`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│         (Window Management, System Automation, TTS)          │
└───────────────────────┬─────────────────────────────────────┘
                        │ IPC
┌───────────────────────▼─────────────────────────────────────┐
│                   Renderer Process                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │     UI       │  │   WebSocket   │  │    Speech    │   │
│  │   (React)    │  │  (OpenClaw)   │  │  (TTS/STT)   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
clippy-desktop/
├── electron/
│   ├── main.ts              # Main process (system access)
│   ├── preload.ts           # IPC bridge
│   └── tsconfig.json
├── src/
│   ├── App.tsx              # Main React component
│   ├── App.css              # Styles
│   └── main.tsx             # Renderer entry
├── assets/                  # Icons, images
├── forge.config.js          # Electron Forge configuration
├── vite.*.config.ts         # Vite build configs
├── WINDOWS_BUILD.md         # Windows-specific build guide
└── PROJECT_REVIEW.md        # Code review & known issues
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_WS_URL` | `ws://localhost:18789` | OpenClaw WebSocket URL |
| `OPENCLAW_API_KEY` | none | Optional API key |
| `NODE_ENV` | `development` | Environment mode |

## OpenClaw Integration

Clippy connects to your local OpenClaw gateway via WebSocket:

1. **Ensure OpenClaw is running:**
   ```bash
   openclaw gateway status
   ```

2. **Check connection status:**
   - Green dot in Clippy = Connected
   - Red dot = Disconnected (auto-reconnects)

3. **Protocol:**
   ```json
   {
     "type": "message",
     "content": "Hello!"
   }
   ```

See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) for WebSocket protocol details.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Production build |
| `npm run package` | Create portable app |
| `npm run make` | Create installer for current platform |
| `npm run package:win` | Package for Windows |
| `npm run make:win` | Create Windows installer |
| `npm run package:mac` | Package for macOS |
| `npm run make:mac` | Create macOS DMG |

## Known Issues

See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) for:
- Complete list of known issues
- Security considerations
- Build troubleshooting
- Future improvements

## Security

- ✅ Context isolation enabled
- ✅ Input sanitization on system commands
- ✅ No nodeIntegration in renderer
- ⚠️ Unsigned binaries (Windows SmartScreen warning expected)

## Contributing

See [PROJECT_REVIEW.md](PROJECT_REVIEW.md) for:
- Code review notes
- Areas needing improvement
- Testing recommendations

## License

MIT

## Credits

- Electron Forge for build tooling
- React + Vite for UI
- OpenClaw for AI backend integration
