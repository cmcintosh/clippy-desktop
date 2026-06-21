import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell, globalShortcut } from 'electron';
import * as path from 'path';
import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import './settings';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Sanitize input to prevent command injection
function sanitizeInput(input: string): string {
  return input.replace(/[;&|`$(){}[\]\\]/g, '');
}

// Safe app launcher that validates input
function validateAppName(appName: string): boolean {
  const validPattern = /^[a-zA-Z0-9\s._-]+$/;
  return validPattern.test(appName) && appName.length < 100;
}

// Safe text for TTS
function sanitizeTTS(text: string): string {
  return text.replace(/["'`]/g, '').substring(0, 500);
}

// Create a simple tray icon programmatically
function createTrayIcon(): nativeImage {
  const size = 64;
  // Create a simple blue circle with eyes (Clippy-like)
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="30%" r="50%">
          <stop offset="0%" style="stop-color:#60a5fa"/>
          <stop offset="100%" style="stop-color:#2563eb"/>
        </radialGradient>
      </defs>
      <!-- Body -->
      <ellipse cx="32" cy="35" rx="28" ry="26" fill="url(#bodyGrad)" stroke="#1d4ed8" stroke-width="2"/>
      <!-- Eyes -->
      <ellipse cx="22" cy="28" rx="6" ry="8" fill="white"/>
      <ellipse cx="42" cy="28" rx="6" ry="8" fill="white"/>
      <circle cx="24" cy="28" r="3" fill="black"/>
      <circle cx="40" cy="28" r="3" fill="black"/>
      <!-- Smile -->
      <path d="M 20 45 Q 32 52 44 45" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>
  `;
  
  return nativeImage.createFromBuffer(Buffer.from(canvas));
}

const createWindow = (): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

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
    // Icon for taskbar
    icon: createTrayIcon(),
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow?.setIgnoreMouseEvents(false);
  });
};

const createTray = (): void => {
  const trayIcon = createTrayIcon();
  trayIcon.setTemplateImage(true);
  
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
        // Open settings via IPC
        const { ipcMain } = require('electron');
        ipcMain.emit('open-settings');
      },
      enabled: true
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

// IPC handlers
ipcMain.handle('macro:keyboard', async (_event, keys: string[]) => {
  try {
    // Validate keys
    const validKeys = keys.every(k => /^[a-zA-Z0-9]$/.test(k));
    if (!validKeys) {
      return { success: false, error: 'Invalid keys' };
    }
    
    // Platform-specific implementation
    if (process.platform === 'win32') {
      const keyString = keys.join(' ');
      // Use powershell to send keys
      const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keyString}')`;
      spawn('powershell.exe', ['-Command', script], { detached: true });
    } else if (process.platform === 'darwin') {
      // macOS - use AppleScript or clicable
      // This is a placeholder - would need proper implementation
      return { success: false, error: 'macOS keyboard macros not yet implemented' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('macro:keyCombo', async (_event, combo: string) => {
  try {
    const validPattern = /^[a-zA-Z0-9+]+$/;
    if (!validPattern.test(combo)) {
      return { success: false, error: 'Invalid key combo format' };
    }
    
    if (process.platform === 'win32') {
      // Parse combo like "ctrl+shift+s"
      const keys = combo.toLowerCase().split('+');
      const modifiers: string[] = [];
      const key = keys.filter(k => {
        if (['ctrl', 'alt', 'shift', 'win'].includes(k)) {
          modifiers.push(k);
          return false;
        }
        return true;
      })[0];
      
      if (!key) {
        return { success: false, error: 'No key specified in combo' };
      }
      
      // Build SendKeys format
      const modifierString = modifiers.map(m => {
        switch(m) {
          case 'ctrl': return '^';
          case 'alt': return '%';
          case 'shift': return '+';
          case 'win': return '#';
          default: return '';
        }
      }).join('');
      
      const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${modifierString}{${key.toUpperCase()}}')`;
      spawn('powershell.exe', ['-Command', script], { detached: true });
      
      return { success: true };
    }
    
    return { success: false, error: 'Platform not yet supported' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('macro:mouseClick', async (_event, options: { x: number; y: number; button?: string }) => {
  try {
    const { x, y, button = 'left' } = options;
    
    if (process.platform === 'win32') {
      // PowerShell mouse click
      const clickType = button === 'right' ? 'Right' : 'Left';
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
        $mouse_event = Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int buttons, int extra);' -Name Win32Functions -Namespace Win32Functions -PassThru
        $mouse_event::mouse_event(0x0002, 0, 0, 0, 0) # Left down
        $mouse_event::mouse_event(0x0004, 0, 0, 0, 0) # Left up
      `;
      spawn('powershell.exe', ['-Command', script], { detached: true });
      return { success: true };
    }
    
    return { success: false, error: 'Mouse automation not implemented for this platform' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:launchApp', async (_event, appName: string) => {
  try {
    if (!validateAppName(appName)) {
      return { success: false, error: 'Invalid app name' };
    }
    
    const sanitized = sanitizeInput(appName);
    
    if (process.platform === 'darwin') {
      spawn('open', ['-a', sanitized], { detached: true });
    } else if (process.platform === 'win32') {
      // Try multiple methods for Windows
      spawn('cmd', ['/c', 'start', '', sanitized], { detached: true });
    } else {
      spawn(sanitized, [], { detached: true });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:screenshot', async () => {
  try {
    if (process.platform === 'win32') {
      // Windows - use Snipping Tool or PowerShell
      const timestamp = Date.now();
      const screenshotPath = path.join(require('os').homedir(), 'Pictures', `clippy-screenshot-${timestamp}.png`);
      
      // Use PowerShell to take screenshot
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
        $bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}')
        $graphics.Dispose()
        $bitmap.Dispose()
      `;
      
      spawn('powershell.exe', ['-Command', script], { detached: true });
      return { success: true, path: screenshotPath };
    } else if (process.platform === 'darwin') {
      // macOS screenshot
      const timestamp = Date.now();
      const screenshotPath = path.join(require('os').homedir(), 'Desktop', `clippy-screenshot-${timestamp}.png`);
      spawn('screencapture', [screenshotPath], { detached: true });
      return { success: true, path: screenshotPath };
    }
    
    return { success: false, error: 'Screenshots not supported on this platform' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('system:focusWindow', async (_event, title: string) => {
  try {
    if (!validateAppName(title)) {
      return { success: false, error: 'Invalid window title' };
    }
    
    if (process.platform === 'win32') {
      // Use PowerShell to find and focus window
      const script = `
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        }
        "@
        $hwnd = [Win32]::FindWindow($null, '${title}')
        if ($hwnd -ne 0) {
          [Win32]::SetForegroundWindow($hwnd)
        }
      `;
      spawn('powershell.exe', ['-Command', script], { detached: true });
      return { success: true };
    }
    
    return { success: false, error: 'Window focus not fully implemented' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('speech:speak', async (_event, text: string) => {
  try {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid text' };
    }
    
    const sanitized = sanitizeTTS(text);
    
    if (process.platform === 'darwin') {
      spawn('say', [sanitized], { detached: true });
    } else if (process.platform === 'win32') {
      const script = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${sanitized.replace(/'/g, "''")}')`;
      spawn('powershell.exe', ['-Command', script], { detached: true });
    } else {
      spawn('espeak', [sanitized], { detached: true });
    }
    
    return { success: true };
  } catch (error) {
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
  
  // Register global shortcut for wake (Ctrl+Shift+C)
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
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
