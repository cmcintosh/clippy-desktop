import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron';
import * as path from 'path';
import { nut } from '@nut-tree/nut-js';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const createWindow = (): void => {
  // Get primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    x: width - 420,
    y: height - 520,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    show: false, // Show when ready
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show when loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle mouse events - click through when not focused
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  
  // Enable mouse events on mouse over
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow?.setIgnoreMouseEvents(false);
  });
};

// Create tray icon
const createTray = (): void => {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  const resizedIcon = trayIcon.resize({ width: 16, height: 16 });
  
  tray = new Tray(resizedIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Clippy', click: () => mainWindow?.show() },
    { label: 'Settings', click: () => console.log('Settings clicked') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  
  tray.setToolTip('Clippy Desktop - AI Companion');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
};

// IPC handlers for system automation
ipcMain.handle('macro:keyboard', async (_event, keys: string[]) => {
  try {
    await nut.keyboard.type(...(keys as any));
    return { success: true };
  } catch (error) {
    console.error('Keyboard macro failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('macro:keyCombo', async (_event, combo: string) => {
  try {
    // Parse combo like "ctrl+shift+t"
    const keys = combo.toLowerCase().split('+');
    const modifiers = keys.slice(0, -1);
    const key = keys[keys.length - 1];
    
    // @ts-ignore
    await nut.keyboard.type(key, ...(modifiers as any));
    return { success: true };
  } catch (error) {
    console.error('Key combo failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('macro:mouseClick', async (_event, options: { x: number; y: number; button?: string }) => {
  try {
    if (options.x !== undefined && options.y !== undefined) {
      await nut.mouse.move({ x: options.x, y: options.y });
    }
    await nut.mouse.click(options.button === 'right' ? nut.Button.RIGHT : nut.Button.LEFT);
    return { success: true };
  } catch (error) {
    console.error('Mouse click failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:launchApp', async (_event, appName: string) => {
  try {
    const { exec } = require('child_process');
    exec(`open -a "${appName}"`, (err: any) => {
      if (err) console.error('Failed to launch app:', err);
    });
    return { success: true };
  } catch (error) {
    console.error('Launch app failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:focusWindow', async (_event, windowTitle: string) => {
  try {
    const { exec } = require('child_process');
    exec(`osascript -e 'tell application "System Events" to tell process "${windowTitle}" to set frontmost to true'`, (err: any) => {
      if (err) console.error('Failed to focus window:', err);
    });
    return { success: true };
  } catch (error) {
    console.error('Focus window failed:', error);
    return { success: false, error: String(error) };
  }
});

// Speech handlers
ipcMain.handle('speech:speak', async (_event, text: string) => {
  try {
    const { exec } = require('child_process');
    exec(`say "${text.replace(/"/g, '\\"')}"`, (err: any) => {
      if (err) console.error('TTS failed:', err);
    });
    return { success: true };
  } catch (error) {
    console.error('TTS failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:hide', () => {
  mainWindow?.hide();
});

ipcMain.handle('window:show', () => {
  mainWindow?.show();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit - keep in tray
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
