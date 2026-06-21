import Store from 'electron-store';
import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';

// Define settings schema
interface SettingsSchema {
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

const defaultSettings: SettingsSchema = {
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

// Create store instance
const store = new Store<SettingsSchema>({
  defaults: defaultSettings,
  name: 'clippy-settings',
});

// Settings window reference
let settingsWindow: BrowserWindow | null = null;

// Get all settings
ipcMain.handle('settings:get', () => {
  return store.store;
});

// Get specific setting
ipcMain.handle('settings:getValue', (_event, key: keyof SettingsSchema) => {
  return store.get(key);
});

// Set specific setting
ipcMain.handle('settings:set', (_event, key: keyof SettingsSchema, value: any) => {
  store.set(key, value);
  return { success: true };
});

// Set multiple settings
ipcMain.handle('settings:setMultiple', (_event, settings: Partial<SettingsSchema>) => {
  Object.entries(settings).forEach(([key, value]) => {
    store.set(key as keyof SettingsSchema, value);
  });
  return { success: true };
});

// Reset to defaults
ipcMain.handle('settings:reset', () => {
  store.clear();
  return { success: true, settings: store.store };
});

// Open settings window
ipcMain.handle('settings:open', () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    x: width / 2 - 250,
    y: height / 2 - 300,
    title: 'Clippy Settings',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the settings page
  if (process.env.NODE_ENV === 'development') {
    settingsWindow.loadURL('http://localhost:5173/settings.html');
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
});

// Close settings window
ipcMain.handle('settings:close', () => {
  settingsWindow?.close();
  settingsWindow = null;
});

export { store };
export type { SettingsSchema };
