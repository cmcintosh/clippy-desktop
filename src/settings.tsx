import React, { useState, useEffect } from 'react';
import './App.css';

interface Settings {
  openclaw: {
    url: string;
    apiKey: string;
    autoConnect: boolean;
  };
  speech: {
    enabled: boolean;
    voice: string;
    rate: number;
  };
  appearance: {
    theme: 'light' | 'dark';
    opacity: number;
    alwaysOnTop: boolean;
  };
  shortcuts: {
    wakeWord: string;
    pushToTalk: boolean;
  };
}

const defaultSettings: Settings = {
  openclaw: {
    url: 'ws://localhost:18789',
    apiKey: '',
    autoConnect: true,
  },
  speech: {
    enabled: true,
    voice: 'default',
    rate: 1.0,
  },
  appearance: {
    theme: 'dark',
    opacity: 0.95,
    alwaysOnTop: true,
  },
  shortcuts: {
    wakeWord: 'hey clippy',
    pushToTalk: false,
  },
};

function SettingsApp() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('openclaw');

  useEffect(() => {
    // Load settings from main process
    if (window.electronAPI?.settings?.get) {
      window.electronAPI.settings.get().then((loaded: Settings) => {
        setSettings(loaded);
      });
    }
  }, []);

  const saveSettings = async () => {
    if (window.electronAPI?.settings?.setMultiple) {
      await window.electronAPI.settings.setMultiple(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const updateSetting = (section: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const closeSettings = () => {
    if (window.electronAPI?.settings?.close) {
      window.electronAPI.settings.close();
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ Clippy Settings</h1>
        <button className="close-btn" onClick={closeSettings}>✕</button>
      </div>

      <div className="settings-tabs">
        {[
          { id: 'openclaw', label: 'OpenClaw', icon: '🔗' },
          { id: 'speech', label: 'Speech', icon: '🔊' },
          { id: 'appearance', label: 'Appearance', icon: '🎨' },
          { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'openclaw' && (
          <div className="settings-section">
            <h3>OpenClaw Connection</h3>
            
            <div className="setting-row">
              <label>WebSocket URL:</label>
              <input
                type="text"
                value={settings.openclaw.url}
                onChange={(e) => updateSetting('openclaw', 'url', e.target.value)}
                placeholder="ws://localhost:18789"
              />
            </div>
            <p className="setting-help">
              The WebSocket URL of your OpenClaw gateway. 
              Check with: <code>openclaw gateway status</code>
            </p>

            <div className="setting-row">
              <label>API Key (optional):</label>
              <input
                type="password"
                value={settings.openclaw.apiKey}
                onChange={(e) => updateSetting('openclaw', 'apiKey', e.target.value)}
                placeholder="Leave empty if no auth required"
              />
            </div>

            <div className="setting-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={settings.openclaw.autoConnect}
                  onChange={(e) => updateSetting('openclaw', 'autoConnect', e.target.checked)}
                />
                Auto-connect on startup
              </label>
            </div>
          </div>
        )}

        {activeTab === 'speech' && (
          <div className="settings-section">
            <h3>Text-to-Speech & Voice</h3>
            
            <div className="setting-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={settings.speech.enabled}
                  onChange={(e) => updateSetting('speech', 'enabled', e.target.checked)}
                />
                Enable Text-to-Speech
              </label>
            </div>

            <div className="setting-row">
              <label>Speech Rate:</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speech.rate}
                onChange={(e) => updateSetting('speech', 'rate', parseFloat(e.target.value))}
              />
              <span>{settings.speech.rate}x</span>
            </div>

            <div className="setting-row">
              <button 
                onClick={() => {
                  if (window.electronAPI?.speak) {
                    window.electronAPI.speak('Hello! This is a voice test.');
                  }
                }}
                disabled={!settings.speech.enabled}
              >
                🗣️ Test Voice
              </button>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h3>Appearance</h3>
            
            <div className="setting-row">
              <label>Theme:</label>
              <select
                value={settings.appearance.theme}
                onChange={(e) => updateSetting('appearance', 'theme', e.target.value)}
              >
                <option value="dark">🌙 Dark</option>
                <option value="light">☀️ Light</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Window Opacity: {Math.round(settings.appearance.opacity * 100)}%</label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={settings.appearance.opacity}
                onChange={(e) => updateSetting('appearance', 'opacity', parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={settings.appearance.alwaysOnTop}
                  onChange={(e) => updateSetting('appearance', 'alwaysOnTop', e.target.checked)}
                />
                Always on top
              </label>
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="settings-section">
            <h3>Keyboard Shortcuts</h3>
            
            <div className="setting-row">
              <label>Wake Word:</label>
              <input
                type="text"
                value={settings.shortcuts.wakeWord}
                onChange={(e) => updateSetting('shortcuts', 'wakeWord', e.target.value)}
                placeholder="hey clippy"
              />
            </div>
            <p className="setting-help">
              Say this phrase to wake Clippy when using voice control.
            </p>

            <div className="setting-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={settings.shortcuts.pushToTalk}
                  onChange={(e) => updateSetting('shortcuts', 'pushToTalk', e.target.checked)}
                />
                Push-to-talk mode (hold mic button)
              </label>
            </div>

            <div className="shortcut-info">
              <h4>Global Shortcuts:</h4>
              <ul>
                <li><kbd>Ctrl+Shift+C</kbd> - Show/Hide Clippy</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="btn-secondary" onClick={closeSettings}>
          Cancel
        </button>
        <button className="btn-primary" onClick={saveSettings}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default SettingsApp;
