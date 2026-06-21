import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// TypeScript declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      sendKeyCombo: (combo: string) => Promise<{ success: boolean }>;
      sendKeys: (keys: string[]) => Promise<{ success: boolean }>;
      mouseClick: (options: { x: number; y: number; button?: string }) => Promise<{ success: boolean }>;
      launchApp: (appName: string) => Promise<{ success: boolean }>;
      focusWindow: (title: string) => Promise<{ success: boolean }>;
      screenshot: () => Promise<{ success: boolean; path?: string }>;
      speak: (text: string) => Promise<{ success: boolean }>;
      minimize: () => Promise<void>;
      hide: () => Promise<void>;
      show: () => Promise<void>;
      settings: {
        get: () => Promise<any>;
        getValue: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<{ success: boolean }>;
        setMultiple: (settings: any) => Promise<{ success: boolean }>;
        reset: () => Promise<{ success: boolean; settings: any }>;
        open: () => Promise<void>;
        close: () => Promise<void>;
      };
    };
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface OpenClawMessage {
  type: 'response' | 'error' | 'ping';
  content?: string;
  animation?: string;
  speak?: boolean;
  error?: string;
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Clippy error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>😵 Clippy crashed!</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Restart</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hi! I'm Clippy. How can I help you today?",
      timestamp: Date.now()
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [animation, setAnimation] = useState('idle');
  const [isAwake, setIsAwake] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [wsUrl, setWsUrl] = useState(import.meta.env.VITE_OPENCLAW_WS_URL || 'ws://localhost:18789');

  // WebSocket refs for reconnection
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings on mount
  useEffect(() => {
    if (window.electronAPI?.settings?.get) {
      window.electronAPI.settings.get().then((loadedSettings) => {
        setSettings(loadedSettings);
        if (loadedSettings?.openclaw?.url) {
          setWsUrl(loadedSettings.openclaw.url);
        }
      });
    }
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onSettingsChanged?.((event, newSettings) => {
      setSettings(newSettings);
      if (newSettings?.openclaw?.url && newSettings.openclaw.url !== wsUrl) {
        // URL changed, reconnect
        setWsUrl(newSettings.openclaw.url);
        if (wsRef.current) {
          wsRef.current.close();
        }
        setReconnectAttempts(0);
        setTimeout(connectWebSocket, 100);
      }
    });
    
    return () => {
      unsubscribe?.();
    };
  }, [wsUrl]);

  // Connect to OpenClaw with reconnection logic
  const connectWebSocket = useCallback(() => {
    // Don't connect if already connecting or connected
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    console.log(`[Clippy] Connecting to OpenClaw at ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Clippy] Connected to OpenClaw');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data: OpenClawMessage = JSON.parse(event.data);
          
          if (data.type === 'response' && data.content) {
            setMessages((prev) => [
              ...prev, 
              { 
                role: 'assistant', 
                content: data.content!,
                timestamp: Date.now()
              }
            ]);
            
            // Trigger animation
            if (data.animation) {
              setAnimation(data.animation);
              setTimeout(() => setAnimation('idle'), 3000);
            }
            
            // Speak response
            if (data.speak) {
              speak(data.content);
            }
          } else if (data.type === 'error') {
            console.error('[Clippy] OpenClaw error:', data.error);
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `Error: ${data.error || 'Unknown error from OpenClaw'}`,
                timestamp: Date.now()
              }
            ]);
          }
        } catch (err) {
          console.error('[Clippy] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[Clippy] WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        console.log('[Clippy] WebSocket closed');
        setConnectionStatus('disconnected');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection with exponential backoff
        const maxReconnectAttempts = 10;
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`[Clippy] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          setReconnectAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          console.error('[Clippy] Max reconnection attempts reached');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Unable to connect to OpenClaw. Please check that the gateway is running.',
              timestamp: Date.now()
            }
          ]);
        }
      };
    } catch (err) {
      console.error('[Clippy] Failed to create WebSocket:', err);
      setConnectionStatus('disconnected');
    }
  }, [wsUrl, reconnectAttempts]);

  // Initial connection
  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Text to speech with error handling
  const speak = useCallback(async (text: string) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.speak(text);
      } else {
        // Fallback: browser speech synthesis
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('[Clippy] TTS error:', err);
    }
  }, []);

  // Send message with validation
  const sendMessage = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Not connected to OpenClaw. Please wait or restart the app.',
          timestamp: Date.now()
        }
      ]);
      return;
    }

    // Add user message
    setMessages((prev) => [
      ...prev, 
      { role: 'user', content: trimmedInput, timestamp: Date.now() }
    ]);
    
    // Send to OpenClaw
    try {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: trimmedInput,
        timestamp: Date.now()
      }));
      
      // Set thinking animation
      setAnimation('thinking');
      setInput('');
    } catch (err) {
      console.error('[Clippy] Failed to send message:', err);
    }
  }, [input]);

  // Handle system commands
  const handleCommand = useCallback(async (command: string) => {
    const lower = command.toLowerCase();
    
    try {
      if (lower.includes('open chrome') || lower.includes('launch chrome')) {
        await window.electronAPI?.launchApp('Google Chrome');
        setMessages((prev) => [
          ...prev, 
          { 
            role: 'assistant', 
            content: 'Opening Chrome!',
            timestamp: Date.now()
          }
        ]);
      } else if (lower.includes('screenshot')) {
        await window.electronAPI?.sendKeyCombo('command+shift+3');
        setMessages((prev) => [
          ...prev, 
          { 
            role: 'assistant', 
            content: 'Taking screenshot!',
            timestamp: Date.now()
          }
        ]);
      } else if (lower.includes('minimize')) {
        await window.electronAPI?.minimize();
      } else if (lower.includes('hide')) {
        await window.electronAPI?.hide();
      } else if (lower.includes('reconnect') || lower.includes('connect')) {
        // Manual reconnect
        if (wsRef.current) wsRef.current.close();
        setReconnectAttempts(0);
        connectWebSocket();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Reconnecting to OpenClaw...',
            timestamp: Date.now()
          }
        ]);
      }
    } catch (err) {
      console.error('[Clippy] Command error:', err);
    }
  }, [connectWebSocket]);

  // Speech recognition with error handling
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('[Clippy] Speech recognition not supported');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Speech recognition is not supported in this browser.',
          timestamp: Date.now()
        }
      ]);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
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

    recognition.onerror = (event: any) => {
      console.error('[Clippy] Speech recognition error:', event.error);
      setIsListening(false);
      setAnimation('idle');
    };
    
    recognition.start();
  }, [speak]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return '○ Connecting...';
      case 'connected':
        return '● Connected';
      case 'disconnected':
        return reconnectAttempts > 0 ? `○ Reconnecting (${reconnectAttempts})...` : '○ Disconnected';
      default:
        return '○ Unknown';
    }
  };

  return (
    <div className="clippy-container">
      {/* 3D Character */}
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
          <span className={`connection-status ${connectionStatus}`}>
            {getStatusText()}
          </span>
          <button 
            className="minimize-btn" 
            onClick={() => window.electronAPI?.minimize()}
            title="Minimize"
          >
            _
          </button>
        </div>

        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="bubble">{msg.content}</div>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

        <div className="input-area">
          <button
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={startListening}
            title="Click to talk"
            disabled={connectionStatus !== 'connected'}
          >
            🎤
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connectionStatus === 'connected' ? "Type or speak..." : "Connecting..."}
            className="chat-input"
            disabled={connectionStatus !== 'connected'}
          />
          
          <button 
            className="send-btn" 
            onClick={sendMessage}
            disabled={!input.trim() || connectionStatus !== 'connected'}
          >
            Send
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button onClick={() => handleCommand('open chrome')}>🌐 Chrome</button>
        <button onClick={() => handleCommand('screenshot')}>📸 Screenshot</button>
        <button onClick={() => setIsAwake(!isAwake)}>
          {isAwake ? '😴 Sleep' : '☀️ Wake'}
        </button>
        <button onClick={() => handleCommand('reconnect')} title="Reconnect to OpenClaw">
          🔄 Reconnect
        </button>
        <button onClick={() => window.electronAPI?.settings?.open()} title="Open Settings">
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
}

// Wrap in error boundary
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
