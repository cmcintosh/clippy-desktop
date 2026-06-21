# Clippy Desktop Companion

An AI-powered desktop pet with 3D animations, voice interaction, and system automation.

## Features

- 🤖 **3D Character** — Animated assistant with personality
- 🎙️ **Voice Control** — Speech-to-text and text-to-speech
- 🔗 **OpenClaw Integration** — Connects to your AI sessions via WebSocket
- ⚡ **System Automation** — Launch apps, keyboard macros, window management
- 🖥️ **Cross-Platform** — Windows, macOS, Linux

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│                    (Window, System, Macros)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ IPC
┌───────────────────────▼─────────────────────────────────────┐
│                   Renderer Process                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Three.js    │  │   WebSocket   │  │   Speech     │   │
│  │   (3D Clippy) │  │   (OpenClaw)  │  │   (TTS/STT)  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop | Electron + TypeScript |
| 3D Rendering | Three.js + React Three Fiber |
| WebSocket | Socket.io-client |
| TTS/STT | Web Speech API + Whisper (local) |
| System Automation | @nut-tree/nut-js |
| State Management | Zustand |

## Project Structure

```
clippy-desktop/
├── electron/
│   ├── main.ts              # Main process (system access)
│   ├── preload.ts           # IPC bridge
│   └── ipc/
│       ├── macros.ts        # Keyboard/mouse automation
│       ├── system.ts        # Launch apps, window management
│       └── speech.ts        # TTS engine wrapper
├── src/
│   ├── components/
│   │   ├── Clippy/          # 3D character component
│   │   ├── VoiceInterface/    # Voice UI (mic, speaker)
│   │   └── ChatBubble/        # Floating chat UI
│   ├── hooks/
│   │   ├── useOpenClaw.ts   # WebSocket connection
│   │   ├── useSpeech.ts     # TTS/STT
│   │   └── useMacros.ts     # Macro triggers
│   ├── store/
│   │   └── session.ts       # Global state
│   └── utils/
│       └── animations.ts    # Clippy animation states
└── assets/
    ├── models/              # Clippy 3D model
    └── animations/          # Animation files
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev        # Development mode
npm run build      # Production build
npm run package    # Package for current platform
```

### Building for Windows

To create a Windows installer:

```bash
# On Windows:
npm run make

# The installer will be in:
# out/make/squirrel.windows/x64/ClippyDesktopSetup.exe
```

Or use GitHub Actions (automatically builds on push to main):
- Windows builds are created automatically
- Download from GitHub Releases

## Configuration

Copy `.env.example` to `.env`:

```env
# OpenClaw Gateway Configuration
# Default port is 18789 (check with: openclaw gateway status)
OPENCLAW_WS_URL=ws://localhost:18789
OPENCLAW_API_KEY=your_openclaw_api_key_here

# Speech Configuration
WHISPER_MODEL_PATH=./models/whisper-base
TTS_VOICE=default

# Character Settings
CLIPPY_PERSONALITY=helpful
CLIPPY_IDLE_TIMEOUT=30000

# Development
NODE_ENV=development
```

## OpenClaw Integration

### How it Works

Clippy connects to your local OpenClaw gateway via WebSocket. This allows:
- Two-way communication with your AI agents
- Voice commands processed by OpenClaw
- Responses spoken back by Clippy

### Requirements for Connection

1. **OpenClaw Gateway must be running**:
   ```bash
   openclaw gateway status
   # Should show "Runtime: running"
   ```

2. **WebSocket URL Configuration**:
   - Default: `ws://localhost:18789`
   - Check your OpenClaw port: `openclaw gateway status`
   - Set in `.env` file or via `VITE_OPENCLAW_WS_URL` environment variable

3. **Firewall/Network**:
   - Local connection only (127.0.0.1)
   - No external network access required
   - Windows Defender may prompt - allow the connection

### Troubleshooting Connection

| Issue | Solution |
|-------|----------|
| "Disconnected" status | Ensure OpenClaw gateway is running |
| Connection refused | Check port in `.env` matches `openclaw gateway status` |
| Windows firewall | Allow ClippyDesktop through Windows Defender |
| WSL/VM | Use `host.docker.internal` or actual IP instead of localhost |

### WebSocket Protocol

The app expects OpenClaw to respond with messages in this format:
```json
{
  "type": "response",
  "content": "Hello from OpenClaw!",
  "animation": "happy",
  "speak": true
}
```

**Note**: This is a simplified protocol. For production use with fox-in-a-box, you may need to implement proper session management and authentication.

## License

MIT

## Releases

Download the latest release for your platform from the [Releases](https://github.com/cmcintosh/clippy-desktop/releases) page.

### Building Releases Locally

```bash
# Build for current platform
npm run make

# Build for specific platform (requires cross-compilation setup)
npx electron-forge make --platform=win32
npx electron-forge make --platform=darwin
```
