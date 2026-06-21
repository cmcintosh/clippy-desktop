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
  
  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  hide: () => ipcRenderer.invoke('window:hide'),
  show: () => ipcRenderer.invoke('window:show'),
  
  // Speech
  speak: (text: string) => ipcRenderer.invoke('speech:speak', text),
});

export {};
