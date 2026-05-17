import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';

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
    show: false,
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

  // Handle mouse events
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow?.setIgnoreMouseEvents(false);
  });
};

// Create tray icon
const createTray = (): void => {
  // Use a simple colored circle as fallback icon
  const emptyIcon = nativeImage.createEmpty();
  tray = new Tray(emptyIcon);
  
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
ipcMain.handle('macro:keyboard', async () => {
  return { success: false, error: 'Keyboard macros not implemented yet' };
});

ipcMain.handle('macro:keyCombo', async () => {
  return { success: false, error: 'Key combos not implemented yet' };
});

ipcMain.handle('macro:mouseClick', async () => {
  return { success: false, error: 'Mouse automation not implemented yet' };
});

ipcMain.handle('system:launchApp', async (_event, appName: string) => {
  try {
    if (process.platform === 'darwin') {
      exec(`open -a "${appName}"`);
    } else if (process.platform === 'win32') {
      exec(`start "" "${appName}"`);
    } else {
      exec(appName);
    }
    return { success: true };
  } catch (error) {
    console.error('Launch app failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:focusWindow', async () => {
  return { success: false, error: 'Window focus not implemented yet' };
});

// Speech handlers
ipcMain.handle('speech:speak', async (_event, text: string) => {
  try {
    if (process.platform === 'darwin') {
      exec(`say "${text.replace(/"/g, '\\"')}"`);
    } else if (process.platform === 'win32') {
      // Windows has built-in TTS via PowerShell
      const psScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("${text.replace(/"/g, '\\"')}");`;
      exec(`powershell.exe -Command "${psScript}"`);
    }
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
  // Don't quit on macOS - stay in tray
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
