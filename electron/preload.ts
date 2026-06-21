import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Macros
  sendKeyCombo: (combo: string) => ipcRenderer.invoke('macro:keyCombo', combo),
  sendKeys: (keys: string[]) => ipcRenderer.invoke('macro:keyboard', keys),
  mouseClick: (options: { x: number; y: number; button?: string }) =>
    ipcRenderer.invoke('macro:mouseClick', options),
  
  // System
  launchApp: (appName: string) => ipcRenderer.invoke('system:launchApp', appName),
  focusWindow: (title: string) => ipcRenderer.invoke('system:focusWindow', title),
  screenshot: () => ipcRenderer.invoke('system:screenshot'),
  
  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  hide: () => ipcRenderer.invoke('window:hide'),
  show: () => ipcRenderer.invoke('window:show'),
  
  // Speech
  speak: (text: string) => ipcRenderer.invoke('speech:speak', text),
  
  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    getValue: (key: string) => ipcRenderer.invoke('settings:getValue', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    setMultiple: (settings: any) => ipcRenderer.invoke('settings:setMultiple', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
    open: () => ipcRenderer.invoke('settings:open'),
    close: () => ipcRenderer.invoke('settings:close'),
  },
  
  // Events from main process
  onToggleSleep: (callback: () => void) => {
    ipcRenderer.on('toggle-sleep', callback);
    return () => ipcRenderer.removeAllListeners('toggle-sleep');
  },
  onSettingsChanged: (callback: (event: any, settings: any) => void) => {
    ipcRenderer.on('settings-changed', callback);
    return () => ipcRenderer.removeAllListeners('settings-changed');
  },
});

export {};
