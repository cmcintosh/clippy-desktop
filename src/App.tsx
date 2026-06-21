import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// TypeScript declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      sendKeyCombo: (combo: string) => Promise<{ success: boolean }>;
      launchApp: (appName: string) => Promise<{ success: boolean }>;
      focusWindow: (title: string) => Promise<{ success: boolean }>;
      speak: (text: string) => Promise<{ success: boolean }>;
      minimize: () => Promise<void>;
      hide: () => Promise<void>;
    };
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Clippy. How can I help you today?" },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [animation, setAnimation] = useState('idle');
  const [isAwake, setIsAwake] = useState(true);

  // WebSocket connection to OpenClaw
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to OpenClaw WebSocket gateway
    // Use env var or default to localhost:18789 (OpenClaw default port)
    const wsUrl = import.meta.env.VITE_OPENCLAW_WS_URL || 'ws://localhost:18789';
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to OpenClaw at', wsUrl);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'response') {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
        
        // Trigger animation
        if (data.animation) {
          setAnimation(data.animation);
          setTimeout(() => setAnimation('idle'), 3000);
        }
        
        // Speak response
        if (data.speak) {
          speak(data.content);
        }
      }
    };
    
    websocket.onclose = () => {
      setIsConnected(false);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  // Text to speech
  const speak = useCallback(async (text: string) => {
    if (window.electronAPI) {
      await window.electronAPI.speak(text);
    } else {
      // Fallback: browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(() => {
    if (!input.trim() || !ws) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    
    // Send to OpenClaw
    ws.send(JSON.stringify({
      type: 'message',
      content: input,
    }));
    
    // Set thinking animation
    setAnimation('thinking');
    setInput('');
  }, [input, ws]);

  // Handle commands
  const handleCommand = useCallback(async (command: string) => {
    const lower = command.toLowerCase();
    
    if (lower.includes('open chrome') || lower.includes('launch chrome')) {
      await window.electronAPI?.launchApp('Google Chrome');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Opening Chrome!' }]);
    } else if (lower.includes('screenshot')) {
      await window.electronAPI?.sendKeyCombo('command+shift+3');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Taking screenshot!' }]);
    } else if (lower.includes('minimize')) {
      await window.electronAPI?.minimize();
    } else if (lower.includes('hide')) {
      await window.electronAPI?.hide();
    }
  }, []);

  // Speech recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }
    
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      setAnimation('listening');
    };
    
    recognition.onend = () => {
      setIsListening(false);
      setAnimation('idle');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      
      // Check for wake word
      if (transcript.toLowerCase().includes('hey clippy')) {
        speak('Yes?');
      }
    };
    
    recognition.start();
  }, [speak]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="clippy-container">
      {/* 3D Character placeholder */}
      <div className={`clippy-character ${animation} ${isAwake ? 'awake' : 'sleeping'}`}>
        <div className="clippy-body">
          <div className="clippy-eyes">
            <div className="eye"></div>
            <div className="eye"></div>
          </div>
          <div className="clippy-mouth" />
        </div>
        <div className="shadow" />
      </div>

      {/* Chat panel */}
      <div className="chat-panel">
        <div className="chat-header">
          <span className={`connection-status ${isConnected ? 'connected' : ''}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
          <button className="minimize-btn" onClick={() => window.electronAPI?.minimize()}>_</button>
        </div>

        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="bubble">{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <button
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={startListening}
            title="Click to talk"
          >
            🎤
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak..."
            className="chat-input"
          />
          
          <button className="send-btn" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button onClick={() => handleCommand('open chrome')}>🌐 Chrome</button>
        <button onClick={() => handleCommand('screenshot')}>📸 Screenshot</button>
        <button onClick={() => setIsAwake(!isAwake)}>{isAwake ? '😴 Sleep' : '☀️ Wake'}</button>
      </div>
    </div>
  );
}

export default App;
