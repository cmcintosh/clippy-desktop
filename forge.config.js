module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    appBundleId: 'com.chrismcintosh.clippy-desktop',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ClippyDesktop',
        authors: 'Chris McIntosh',
        description: 'AI-powered desktop companion',
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Chris McIntosh',
          homepage: 'https://github.com/chrismcintosh/clippy-desktop',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
