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

```bash
npm install
npm run dev        # Development mode
npm run build      # Production build
npm run package    # Package for distribution
```

## Configuration

Copy `.env.example` to `.env`:

```env
# OpenClaw Gateway
OPENCLAW_WS_URL=ws://localhost:8080
OPENCLAW_API_KEY=your_key_here

# Speech
WHISPER_MODEL_PATH=./models/whisper-base
TTS_VOICE=default

# Character
CLIPPY_PERSONALITY=helpful
CLIPPY_IDLE_TIMEOUT=30000
```

## License

MIT
