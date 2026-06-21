import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Sanitize input to prevent command injection
function sanitizeInput(input: string): string {
  // Remove dangerous characters that could be used for injection
  return input.replace(/[;&|`$(){}[\]\\]/g, '');
}

// Safe app launcher that validates input
function validateAppName(appName: string): boolean {
  // Whitelist of allowed characters for app names
  const validPattern = /^[a-zA-Z0-9\s._-]+$/;
  return validPattern.test(appName) && appName.length < 100;
}

// Safe text for TTS (prevent command injection)
function sanitizeTTS(text: string): string {
  // Escape quotes and remove dangerous characters
  return text.replace(/["'`]/g, '').substring(0, 500); // Limit length
}

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
      webSecurity: process.env.NODE_ENV !== 'development',
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

// Create tray icon with fallback
const createTray = (): void => {
  let trayIcon: nativeImage;
  
  try {
    // Try to load icon from assets
    const iconPath = path.join(__dirname, '../assets/icon.png');
    trayIcon = nativeImage.createFromPath(iconPath);
    
    // Resize if needed
    if (trayIcon.getSize().width > 16) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
  } catch {
    // Fallback: create a simple colored icon programmatically
    console.log('[Clippy] Using fallback tray icon');
    const size = { width: 16, height: 16 };
    
    // Create a simple canvas-based icon
    trayIcon = nativeImage.createEmpty();
    
    // Alternative: use a data URL for a simple icon
    const svgIcon = `
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="#0078d4"/>
        <circle cx="6" cy="6" r="1.5" fill="white"/>
        <circle cx="10" cy="6" r="1.5" fill="white"/>
        <path d="M5 10 Q8 12 11 10" stroke="white" stroke-width="1.5" fill="none"/>
      </svg>
    `;
    trayIcon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}`);
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Clippy', 
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    { 
      label: 'Toggle Awake/Sleep',
      click: () => {
        mainWindow?.webContents.send('toggle-sleep');
      }
    },
    { type: 'separator' },
    { 
      label: 'Settings', 
      click: () => {
        console.log('Settings clicked - not implemented');
      },
      enabled: false
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.quit();
      }
    },
  ]);
  
  tray.setToolTip('Clippy Desktop - AI Companion');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
};

// IPC handlers for system automation
ipcMain.handle('macro:keyboard', async () => {
  return { success: false, error: 'Keyboard macros not implemented yet' };
});

ipcMain.handle('macro:keyCombo', async (_event, combo: string) => {
  try {
    // Validate combo format (e.g., "command+shift+3")
    const validPattern = /^[a-zA-Z0-9+]+$/;
    if (!validPattern.test(combo)) {
      return { success: false, error: 'Invalid key combo format' };
    }
    
    // Platform-specific implementation would go here
    // For now, return not implemented
    return { success: false, error: 'Key combos not fully implemented yet' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('macro:mouseClick', async () => {
  return { success: false, error: 'Mouse automation not implemented yet' };
});

// Safe app launcher with input validation
ipcMain.handle('system:launchApp', async (_event, appName: string) => {
  try {
    // Validate app name to prevent injection
    if (!validateAppName(appName)) {
      console.error('[Clippy] Invalid app name:', appName);
      return { success: false, error: 'Invalid app name' };
    }
    
    const sanitizedAppName = sanitizeInput(appName);
    console.log('[Clippy] Launching app:', sanitizedAppName);
    
    if (process.platform === 'darwin') {
      // Use spawn instead of exec for better security
      const child = spawn('open', ['-a', sanitizedAppName], { 
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else if (process.platform === 'win32') {
      // On Windows, use shell.openExternal or spawn
      const child = spawn('cmd', ['/c', 'start', '', sanitizedAppName], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else {
      // Linux - try to spawn directly
      const child = spawn(sanitizedAppName, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Clippy] Launch app failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:focusWindow', async () => {
  return { success: false, error: 'Window focus not implemented yet' };
});

// Safe TTS handler with input validation
ipcMain.handle('speech:speak', async (_event, text: string) => {
  try {
    // Validate and sanitize input
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid text' };
    }
    
    const sanitizedText = sanitizeTTS(text);
    console.log('[Clippy] Speaking:', sanitizedText.substring(0, 50) + '...');
    
    if (process.platform === 'darwin') {
      // macOS say command
      const child = spawn('say', [sanitizedText], { 
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else if (process.platform === 'win32') {
      // Windows PowerShell TTS
      const psScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${sanitizedText.replace(/'/g, "''")}');`;
      const child = spawn('powershell.exe', ['-Command', psScript], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else {
      // Linux - try espeak or festival
      const child = spawn('espeak', [sanitizedText], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Clippy] TTS failed:', error);
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

// Handle toggle-sleep event from tray
ipcMain.on('toggle-sleep', () => {
  mainWindow?.webContents.send('toggle-sleep');
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
    mainWindow.show();
    mainWindow.focus();
  }
});
