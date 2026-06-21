const path = require('path');

// Determine which makers to use based on platform
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

const makers = [];

// Windows: Squirrel (creates .exe installer)
if (isWindows) {
  makers.push({
    name: '@electron-forge/maker-squirrel',
    config: {
      name: 'ClippyDesktop',
      authors: 'Chris McIntosh',
      description: 'AI-powered desktop companion with voice control',
      // Setup.exe configuration
      setupExe: 'ClippyDesktopSetup.exe',
      setupIcon: path.join(__dirname, 'assets', 'icon.ico'),
      // Skip creating delta packages (faster build)
      noDelta: true,
    },
  });
  
  // Also add portable ZIP for Windows
  makers.push({
    name: '@electron-forge/maker-zip',
    platforms: ['win32'],
    config: {
      // Creates a portable ZIP file
    },
  });
}

// macOS: DMG (creates .dmg installer)
if (isMac) {
  makers.push({
    name: '@electron-forge/maker-dmg',
    config: {
      format: 'ULFO', // Universal Disk Image Format
      icon: path.join(__dirname, 'assets', 'icon.icns'),
      // DMG window options
      additionalResources: [],
    },
  });
}

// Linux: deb and rpm packages
if (isLinux) {
  makers.push({
    name: '@electron-forge/maker-deb',
    config: {
      options: {
        maintainer: 'Chris McIntosh',
        homepage: 'https://github.com/chrismcintosh/clippy-desktop',
        description: 'AI-powered desktop companion with voice control',
        categories: ['Utility', 'Office'],
      },
    },
  });
  
  makers.push({
    name: '@electron-forge/maker-rpm',
    config: {
      options: {
        homepage: 'https://github.com/chrismcintosh/clippy-desktop',
        description: 'AI-powered desktop companion with voice control',
      },
    },
  });
}

module.exports = {
  packagerConfig: {
    asar: true,
    // Icon configuration - different formats for different platforms
    icon: path.join(__dirname, 'assets', 'icon'),
    appBundleId: 'com.chrismcintosh.clippy-desktop',
    // Application metadata
    name: 'ClippyDesktop',
    executableName: 'ClippyDesktop',
    // Additional files to include in the app
    extraResource: [
      // Add any additional files here
    ],
    // Windows-specific options
    win32metadata: {
      CompanyName: 'Wembassy',
      FileDescription: 'Clippy Desktop - AI Companion',
      OriginalFilename: 'ClippyDesktop.exe',
      ProductName: 'Clippy Desktop',
      InternalName: 'ClippyDesktop',
    },
  },
  rebuildConfig: {
    // Force rebuild of native modules
    force: true,
  },
  makers: makers,
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'cmcintosh',
          name: 'clippy-desktop',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  // Build hooks for additional processing
  hooks: {
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      console.log(`[Clippy] Packaging for ${platform} ${arch}`);
    },
    readPackageJson: async (forgeConfig, packageJson) => {
      // Override package.json values during build
      return {
        ...packageJson,
        main: '.vite/main.js', // Ensure correct entry point
      };
    },
  },
};
