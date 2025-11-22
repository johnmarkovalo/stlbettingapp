import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  NativeModules,
} from 'react-native';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';

const {ApkInstaller} = NativeModules;

// API endpoint for version checking
// Laravel server API endpoint
const VERSION_CHECK_URL = 'http://zian-api-v2.philippinestl.com/api/version';

export interface ServerVersionInfo {
  latestVersion: string;
  versionCode: number;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes?: string;
  minimumVersion?: string;
}

export interface UpdateInfo {
  currentVersion: string;
  currentVersionCode: number;
  latestVersion: string;
  latestVersionCode: number;
  needsUpdate: boolean;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes?: string;
}

/**
 * Get current app version
 */
export const getCurrentVersion = (): string => {
  return DeviceInfo.getVersion();
};

/**
 * Get current version code (build number)
 */
export const getCurrentVersionCode = (): number => {
  return parseInt(DeviceInfo.getBuildNumber(), 10);
};

/**
 * Check if a new version is available from your server
 */
export const checkForUpdate = async (
  serverUrl?: string,
): Promise<UpdateInfo | null> => {
  try {
    const url = serverUrl || VERSION_CHECK_URL;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Version check failed:', response.status);
      return null;
    }

    const serverInfo: ServerVersionInfo = await response.json();
    const currentVersion = getCurrentVersion();
    const currentVersionCode = getCurrentVersionCode();

    // Compare version codes (more reliable than string comparison)
    const needsUpdate = serverInfo.versionCode > currentVersionCode;

    return {
      currentVersion,
      currentVersionCode,
      latestVersion: serverInfo.latestVersion,
      latestVersionCode: serverInfo.versionCode,
      needsUpdate,
      downloadUrl: serverInfo.downloadUrl,
      forceUpdate: serverInfo.forceUpdate || false,
      releaseNotes: serverInfo.releaseNotes,
    };
  } catch (error) {
    console.error('Error checking for update:', error);
    return null;
  }
};

/**
 * Request install permission for Android 8+
 */
export const requestInstallPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // For Android 8.0+ (API 26+), we need REQUEST_INSTALL_PACKAGES permission
    // This permission is already declared in AndroidManifest.xml
    // If installation fails, Android will prompt user to allow installation from this source

    // Request storage permission for downloading
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'App needs access to storage to download the update.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        'Permission Required',
        'Storage permission is needed to download updates.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ],
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

/**
 * Download APK file
 */
export const downloadAPK = async (
  downloadUrl: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> => {
  try {
    const downloadDest = `${RNFS.DocumentDirectoryPath}/update.apk`;

    // Delete old APK if exists
    if (await RNFS.exists(downloadDest)) {
      await RNFS.unlink(downloadDest);
    }

    const download = RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadDest,
      progress: res => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      progressDivider: 10,
    });

    const result = await download.promise;

    if (result.statusCode === 200) {
      console.log('APK downloaded successfully:', downloadDest);
      return downloadDest;
    } else {
      console.error('Download failed with status:', result.statusCode);
      return null;
    }
  } catch (error) {
    console.error('Error downloading APK:', error);
    return null;
  }
};

/**
 * Install APK file using native Android intent
 */
export const installAPK = async (filePath: string): Promise<void> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('APK installation only supported on Android');
    }

    console.log('Installing APK from:', filePath);

    // Check if file exists
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error(`APK file not found at: ${filePath}`);
    }

    // Use our native module to properly open the APK installer
    // This handles FileProvider for Android 7.0+ automatically
    if (ApkInstaller) {
      console.log('Using native ApkInstaller module');
      await ApkInstaller.install(filePath);
      console.log('APK installer opened successfully');
    } else {
      console.warn('Native ApkInstaller module not found, using fallback');
      // Fallback: Try direct file URI (works on older Android versions)
      const uri = `file://${filePath}`;
      await Linking.openURL(uri);
    }
  } catch (error: any) {
    console.error('Error installing APK:', error);
    throw new Error(
      `Could not open APK installer: ${error.message || 'Unknown error'}`,
    );
  }
};

/**
 * Show update progress dialog
 */
let progressDialog: any = null;

export const showDownloadProgress = (progress: number) => {
  // This is a simple console log
  // You can implement a proper progress dialog using react-native-modal or similar
  console.log(`Download progress: ${progress.toFixed(0)}%`);
};

/**
 * Download and install update
 */
export const downloadAndInstallUpdate = async (
  downloadUrl: string,
): Promise<void> => {
  try {
    // Request permissions
    const hasPermission = await requestInstallPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Cannot download update without storage permission.',
      );
      return;
    }

    // Show loading alert
    Alert.alert(
      'Downloading Update',
      'Please wait while the update downloads...',
    );

    // Download APK
    const apkPath = await downloadAPK(downloadUrl, progress => {
      showDownloadProgress(progress);
    });

    if (!apkPath) {
      Alert.alert(
        'Download Failed',
        'Could not download the update. Please try again later.',
      );
      return;
    }

    // Install APK
    Alert.alert(
      'Download Complete',
      'The update has been downloaded. Tap OK to install.',
      [
        {
          text: 'OK',
          onPress: async () => {
            try {
              await installAPK(apkPath);
            } catch (error) {
              Alert.alert(
                'Installation Failed',
                'Could not install the update. Please try again.',
              );
            }
          },
        },
      ],
    );
  } catch (error) {
    console.error('Error in download and install:', error);
    Alert.alert(
      'Update Failed',
      'An error occurred while updating. Please try again.',
    );
  }
};

/**
 * Show update alert with options
 */
export const showUpdateAlert = (updateInfo: UpdateInfo) => {
  const title = updateInfo.forceUpdate ? 'Update Required' : 'Update Available';

  let message = `A new version (${updateInfo.latestVersion}) is available. You are currently using version ${updateInfo.currentVersion}.\n\n`;

  if (updateInfo.releaseNotes) {
    message += `What's new:\n${updateInfo.releaseNotes}\n\n`;
  }

  message += 'Would you like to download and install the update now?';

  const buttons = updateInfo.forceUpdate
    ? [
        {
          text: 'Update Now',
          onPress: () => downloadAndInstallUpdate(updateInfo.downloadUrl),
        },
      ]
    : [
        {
          text: 'Later',
          style: 'cancel' as const,
        },
        {
          text: 'Update Now',
          onPress: () => downloadAndInstallUpdate(updateInfo.downloadUrl),
        },
      ];

  Alert.alert(title, message, buttons, {cancelable: !updateInfo.forceUpdate});
};

/**
 * Perform manual update check (triggered by user)
 */
export const manualUpdateCheck = async (serverUrl?: string) => {
  try {
    Alert.alert('Checking...', 'Checking for updates...');

    const updateInfo = await checkForUpdate(serverUrl);

    if (!updateInfo) {
      Alert.alert(
        'Error',
        'Could not check for updates. Please check your internet connection and try again.',
      );
      return;
    }

    if (updateInfo.needsUpdate) {
      showUpdateAlert(updateInfo);
    } else {
      Alert.alert(
        'Up to Date',
        `You are using the latest version (${updateInfo.currentVersion}).`,
        [{text: 'OK'}],
      );
    }
  } catch (error) {
    console.error('Manual update check error:', error);
    Alert.alert(
      'Error',
      'Could not check for updates. Please try again later.',
    );
  }
};

/**
 * Automatic update check (on app start)
 * @param serverUrl - Optional custom server URL
 * @param silentFail - Whether to fail silently
 */
export const automaticUpdateCheck = async (
  serverUrl?: string,
  silentFail: boolean = true,
) => {
  try {
    const updateInfo = await checkForUpdate(serverUrl);

    if (updateInfo && updateInfo.needsUpdate) {
      // Show alert after a small delay to allow app to fully load
      setTimeout(() => {
        showUpdateAlert(updateInfo);
      }, 2000);
    }
  } catch (error) {
    console.error('Automatic update check error:', error);
    if (!silentFail) {
      Alert.alert('Update Check Failed', 'Could not check for updates.');
    }
    // Silently fail for automatic checks by default
  }
};

/**
 * Silent background update check and download
 * Downloads update in background without showing dialog
 * Shows notification when ready to install
 */
export const silentBackgroundUpdate = async (
  serverUrl?: string,
): Promise<void> => {
  try {
    const updateInfo = await checkForUpdate(serverUrl);

    if (!updateInfo || !updateInfo.needsUpdate) {
      console.log('No update available');
      return;
    }

    console.log('Update available, downloading in background...');

    // Request permissions silently
    const hasPermission = await requestInstallPermission();
    if (!hasPermission) {
      console.log('Install permission not granted');
      return;
    }

    // Download APK in background
    const apkPath = await downloadAPK(updateInfo.downloadUrl, progress => {
      console.log(`Background download progress: ${progress.toFixed(0)}%`);
    });

    if (apkPath) {
      // Download complete - show notification
      Alert.alert(
        'Update Ready',
        `Version ${updateInfo.latestVersion} has been downloaded and is ready to install.`,
        [
          {
            text: 'Install Now',
            onPress: async () => {
              try {
                await installAPK(apkPath);
              } catch (error) {
                console.error('Installation error:', error);
              }
            },
          },
          {
            text: 'Later',
            style: 'cancel',
          },
        ],
      );
    }
  } catch (error) {
    console.error('Silent background update error:', error);
  }
};

/**
 * Aggressive auto-update with forced installation
 * User cannot dismiss until they install (use carefully!)
 */
export const aggressiveAutoUpdate = async (
  serverUrl?: string,
): Promise<void> => {
  try {
    const updateInfo = await checkForUpdate(serverUrl);

    if (!updateInfo || !updateInfo.needsUpdate) {
      return;
    }

    // If server says force update, make it mandatory
    if (updateInfo.forceUpdate) {
      // Show blocking dialog
      Alert.alert(
        'Update Required',
        `A critical update (${updateInfo.latestVersion}) must be installed before you can continue using the app.`,
        [
          {
            text: 'Update Now',
            onPress: () => downloadAndInstallUpdate(updateInfo.downloadUrl),
          },
        ],
        {
          cancelable: false, // Cannot dismiss
        },
      );
    } else {
      // Optional update
      showUpdateAlert(updateInfo);
    }
  } catch (error) {
    console.error('Aggressive auto-update error:', error);
  }
};

/**
 * Check if update is available (without showing alert)
 */
export const isUpdateAvailable = async (
  serverUrl?: string,
): Promise<boolean> => {
  try {
    const updateInfo = await checkForUpdate(serverUrl);
    return updateInfo?.needsUpdate || false;
  } catch (error) {
    console.error('Error checking update availability:', error);
    return false;
  }
};
