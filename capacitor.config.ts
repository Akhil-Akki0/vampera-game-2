const config = {
  appId: 'com.bloodline.vampireszombies',
  appName: 'BLOODLINE: Vampire vs Zombies',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#07090e',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#07090e',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#07090e',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07090e',
      overlaysWebView: true,
    },
  },
};

export default config;
