# Clippy Desktop - Project Review

**Date:** June 21, 2026  
**Reviewer:** Spock (CTO)

---

## 🔴 Critical Issues Found

### 1. Missing Dependency: `electron-squirrel-startup`

**File:** `electron/main.ts:7-9`
```typescript
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}
```

**Problem:** This module is used but not listed in `package.json` dependencies.

**Fix:** Add to dependencies:
```json
"dependencies": {
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "electron-squirrel-startup": "^1.0.1"
}
```

---

### 2. Missing `.gitignore` Entries

**File:** `.gitignore`

**Missing:**
```
# Vite build output (crucial!)
.vite/

# Electron build outputs (already have dist/ and out/)
# but .vite/ is new and missing
```

**Impact:** Build artifacts may be committed to git.

---

### 3. Config Inconsistencies (FIXED in latest)

**Status:** ✅ Fixed in current main branch

The Vite output paths were corrected:
- `vite.main.config.ts`: `outDir: '.vite'` ✅
- `vite.preload.config.ts`: `outDir: '.vite'` ✅
- `package.json`: `"main": ".vite/main.js"` ✅

---

### 4. Tray Icon Issues

**File:** `electron/main.ts:67-68`
```typescript
const emptyIcon = nativeImage.createEmpty();
tray = new Tray(emptyIcon);
```

**Problem:** Empty tray icon may not display properly on all platforms.

**Fix:** Add a real icon or handle gracefully:
```typescript
let trayIcon;
try {
  trayIcon = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));
} catch {
  // Fallback: create a simple colored icon
  const size = { width: 16, height: 16 };
  trayIcon = nativeImage.createEmpty();
}
tray = new Tray(trayIcon);
```

---

### 5. Security: Command Injection Risk

**File:** `electron/main.ts:89-103`
```typescript
exec(`open -a "${appName}"`);
exec(`say "${text.replace(/"/g, '\\"')}"`);
```

**Problem:** User input passed directly to shell commands. While currently internal, this is dangerous if extended.

**Recommendation:** Use proper escaping or Electron's shell API:
```typescript
import { shell } from 'electron';
// Instead of exec for opening apps:
shell.openExternal(`file:///Applications/${appName}.app`);
```

---

### 6. WebSocket Connection Handling

**File:** `src/App.tsx:31-67`

**Problem:** No reconnection logic, no error handling for failed connections.

**Issues:**
- No retry on disconnect
- No heartbeat/ping-pong
- Hardcoded `ws://localhost:18789` without fallback

**Fix:** Add reconnection logic:
```typescript
const connectWebSocket = () => {
  const ws = new WebSocket(wsUrl);
  
  ws.onclose = () => {
    console.log('WebSocket closed, retrying in 5s...');
    setTimeout(connectWebSocket, 5000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  setWs(ws);
};
```

---

### 7. Missing Type Safety in App.tsx

**File:** `src/App.tsx:58`

**Problem:** TypeScript error in original code:
```typescript
if (data.speak)>{  // Typo: should be {
```

**Status:** Fixed in current main ✅

---

### 8. Build Configuration Issues

**File:** `forge.config.js` (embedded in package.json)

**Problems:**
1. References `assets/icon.icns` which doesn't exist
2. Includes all makers (deb, rpm, dmg, squirrel) - builds will fail on wrong platforms
3. No Windows-specific icon config

**Fix:** Remove Linux makers when building for Windows:
```javascript
// Only include relevant makers per platform
const makers = [];
if (process.platform === 'win32') {
  makers.push({ name: '@electron-forge/maker-squirrel', ... });
} else if (process.platform === 'darwin') {
  makers.push({ name: '@electron-forge/maker-dmg', ... });
}
```

---

## 🟡 Warnings

### 9. No Tests

**Impact:** No automated verification of fixes.

**Recommendation:** Add Jest tests:
```bash
npm install --save-dev jest @types/jest
```

### 10. No Error Boundaries

**File:** `src/App.tsx`

**Problem:** Component crashes will crash the entire app.

### 11. `webSecurity: false` in Development

**File:** `electron/main.ts:36`

**Current:** 
```typescript
webSecurity: process.env.NODE_ENV !== 'development'
```

**Problem:** Still disables security in dev. Better to use a dev-only CSP.

---

## 🟢 Good Practices Found

✅ Context isolation enabled  
✅ Preload script properly configured  
✅ TypeScript throughout  
✅ IPC handlers properly typed  
✅ Single instance lock implemented  

---

## Summary: Priority Fixes

| Priority | Issue | File |
|----------|-------|------|
| 🔴 P0 | Add `electron-squirrel-startup` dependency | `package.json` |
| 🔴 P0 | Add `.vite/` to `.gitignore` | `.gitignore` |
| 🟡 P1 | Fix tray icon | `electron/main.ts` |
| 🟡 P1 | Add WebSocket reconnection | `src/App.tsx` |
| 🟡 P1 | Add command validation | `electron/main.ts` |
| 🟢 P2 | Add tests | new files |
| 🟢 P2 | Dynamic maker config | `package.json` |

---

## Working Build Steps

After fixing P0 issues:

```bash
# 1. Clean install
rm -rf node_modules package-lock.json .vite out dist
npm install

# 2. For Windows (on WSL, just package, no installer)
npx electron-forge package --platform=win32

# 3. Or on actual Windows for full installer
npm run make
```

**Result:** `out/ClippyDesktop-win32-x64/ClippyDesktop.exe`

---

## Recommendation

The project needs a comprehensive cleanup. The core architecture is sound, but:
1. **Dependencies are incomplete**
2. **Build config is fragile**
3. **Error handling is minimal**

Consider starting a `v2.0` branch with proper testing and CI/CD before adding features.
