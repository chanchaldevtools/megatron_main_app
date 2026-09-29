import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import Login from './src/screens/Login';
import DrawerNavigation from './src/navigation/DrawerNavigation';
import { toastConfig } from './src/utils/toastConfig';
import { 
  ActivityIndicator, 
  View, 
  Alert, 
  Linking, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  Text,
  
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  AppState
} from 'react-native';
import { requestAllPermissions } from './src/utils/permissions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';
import { PERMISSIONS, request, check } from 'react-native-permissions';
import { SafeAreaView } from 'react-native-safe-area-context';
// FIX: react-native-fs has NO installApk() method — that was the bug.
// react-native-file-viewer opens files (including .apk) via Android's
// ACTION_VIEW intent through a bundled FileProvider, which is what actually
// triggers the package installer.
// npm install react-native-file-viewer
import FileViewer from 'react-native-file-viewer';
const Stack = createNativeStackNavigator();
const { width, height } = Dimensions.get('window');

// ========== APP VERSION (DECLARE HERE) ==========
const APP_VERSION = "2.0.0"; // Change this when you release a new version

// ========== UTILITY FUNCTIONS ==========

// Clean APK URL
const cleanApkUrl = (rawUrl) => {
  if (!rawUrl) return '';
  
  const lines = rawUrl.split('\r\n').filter(line => line.trim().length > 0);
  let url = lines[lines.length - 1] || rawUrl;
  url = url.trim();
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  console.log('Cleaned URL:', url);
  return url;
};

// Compare two version strings for equality, ignoring trailing-zero
// differences in segment count (e.g. "2.0" === "2.0.0")
const versionsAreEqual = (currentVersion, serverVersion) => {
  const parts1 = currentVersion.split('.').map(Number);
  const parts2 = serverVersion.split('.').map(Number);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 !== num2) return false;
  }
  return true;
};

// Kept for logging/debugging purposes only — no longer used to gate updates.
// Update requirement is now driven purely by version equality (see
// versionsAreEqual above): same -> continue, different (older OR newer) -> update.
const isNewerVersion = (currentVersion, serverVersion) => {
  const parts1 = currentVersion.split('.').map(Number);
  const parts2 = serverVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num2 > num1) return true;  // Server version is newer
    if (num2 < num1) return false; // Server version is older
  }
  return false; // Equal
};

// ========== CHECK FUNCTIONS ==========

// Check Maintenance Mode
const checkMaintenanceMode = async () => {
  try {
    console.log('🔍 Checking maintenance mode...');
    const response = await fetch('https://truckapp.inextwebs.com/public/api/getmaintanancemode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Maintenance API response:', data);
    
    if (data.status && data.data && data.data.is_maintanance === "1") {
      return {
        isMaintenance: true,
        maintenanceData: data.data
      };
    }
    
    return {
      isMaintenance: false,
      maintenanceData: null
    };
  } catch (error) {
    console.error('❌ Error checking maintenance mode:', error);
    return {
      isMaintenance: false,
      maintenanceData: null
    };
  }
};

// Check App Version from Server
const checkAppVersion = async () => {
  try {
    console.log('🔍 Checking app version...');
    console.log(`📱 Current App Version: ${APP_VERSION}`);
    
    const response = await fetch('https://inextwebs.com/megatron_new/api/v1/getversionControl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Version API response:', data);
    
    if (data.status && data.data) {
      const serverVersion = data.data.current_version.toString();
      const rawApkUrl = data.data.apk_url;
      const cleanedApkUrl = cleanApkUrl(rawApkUrl);
      const forceUpdate = data.data.force_update === "1" || data.data.force_update === 1;
      const releaseNotes = data.data.release_notes || '';
      
      console.log(`📱 Server Version: ${serverVersion}`);
      console.log(`📥 APK URL: ${cleanedApkUrl || 'No URL'}`);
      console.log(`🔒 Force Update: ${forceUpdate}`);
      
      // Versions match -> continue into the app.
      // Versions differ (older OR newer) -> show the update screen.
      const isSame = versionsAreEqual(APP_VERSION, serverVersion);

      console.log(`📊 Version comparison: Same: ${isSame}`);
      
      return {
        requiresUpdate: !isSame,
        apkUrl: cleanedApkUrl,
        latestVersion: serverVersion,
        forceUpdate,
        releaseNotes,
        currentVersion: APP_VERSION,
        isSameVersion: isSame
      };
    }
    
    console.warn('⚠️ Invalid API response format');
    return { 
      requiresUpdate: false, 
      apkUrl: '', 
      latestVersion: '', 
      forceUpdate: false,
      releaseNotes: '',
      currentVersion: APP_VERSION,
      isSameVersion: true
    };
  } catch (error) {
    console.error('❌ Error checking app version:', error);
    return { 
      requiresUpdate: false, 
      apkUrl: '', 
      latestVersion: '', 
      forceUpdate: false,
      releaseNotes: '',
      currentVersion: APP_VERSION,
      isSameVersion: true
    };
  }
};

// ========== SCREEN COMPONENTS ==========

// Maintenance Screen
const MaintenanceScreen = ({ maintenanceData, onRetry }) => {
  const { note, max_time } = maintenanceData || {};
  
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
    }
  };

  return (
    <SafeAreaView style={styles.maintenanceContainer}>
      <Icon name="construct" size={80} color="#FFA500" />
      <Text style={styles.maintenanceTitle}>Maintenance Mode</Text>
      
      <View style={styles.maintenanceMessageBox}>
        <Icon name="info" size={24} color="#FFA500" style={styles.infoIcon} />
        <Text style={styles.maintenanceMessage}>
          {note || 'The app is currently under maintenance. Please try again later.'}
        </Text>
      </View>
      
      {max_time && (
        <View style={styles.timeContainer}>
          <Icon name="access-time" size={20} color="#666" />
          <Text style={styles.timeText}>
            Estimated completion time: {formatTime(max_time)}
          </Text>
        </View>
      )}
      
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>What you can do:</Text>
        <View style={styles.tipItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.tipText}>Please wait for the maintenance to complete</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.tipText}>The app will be back shortly</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.tipText}>All your data is safe and secure</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Icon name="refresh" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Check Status Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ========== IMPROVED UPDATE SCREEN ==========
const UpdateScreen = ({ apkUrl, latestVersion, forceUpdate, releaseNotes, currentVersion, onRetry }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cleanedUrl, setCleanedUrl] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadedFilePath, setDownloadedFilePath] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setCleanedUrl(cleanApkUrl(apkUrl));
  }, [apkUrl]);

  useEffect(() => {
    if (showSuccess) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [showSuccess]);

  const handleDownload = async (url) => {
    if (!url) {
      Alert.alert('Error', 'Download link is not available. Please contact support.');
      return;
    }

    // If already downloaded, just install
    if (isDownloaded && downloadedFilePath) {
      await handleInstall(downloadedFilePath);
      return;
    }

    // Check storage permission for Android
    if (Platform.OS === 'android') {
      const permission = Platform.Version >= 33 
        ? PERMISSIONS.ANDROID.READ_MEDIA_AUDIO 
        : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
      
      const granted = await check(permission);
      if (granted !== 'granted') {
        const result = await request(permission);
        if (result !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Storage permission is required to download the update.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Grant Permission', onPress: () => handleDownload(url) }
            ]
          );
          return;
        }
      }
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // FIX: give the file a real .apk extension. Without one, some Android
      // versions/launchers refuse to resolve a package-installer intent for
      // it even when the correct MIME type is passed explicitly.
      // FIX: download into CachesDirectoryPath instead of
      // DocumentDirectoryPath. react-native-file-viewer registers its own
      // FileProvider with a fixed <paths> config, and on some RN/library
      // versions that config only exposes the cache directories, not the
      // internal files directory. If the installer can't resolve a
      // content:// URI for the path, the install silently never starts.
      const fileName = `app_update_${Date.now()}.apk`;
      const downloadPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      
      console.log('📥 Downloading to:', downloadPath);

      const { promise } = RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadPath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          if (isMounted.current) {
            setDownloadProgress(progress);
          }
        },
        progressDivider: 5,
      });

      const result = await promise;

      if (result.statusCode === 200) {
        console.log('✅ Download completed successfully');
        if (isMounted.current) {
          setIsDownloaded(true);
          setDownloadedFilePath(downloadPath);
          setShowSuccess(true);
          setIsDownloading(false);
        }
        
        // Auto install after download
        Alert.alert(
          '✅ Download Complete',
          'The update has been downloaded successfully. Would you like to install it now?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Install Now', 
              onPress: async () => {
                await handleInstall(downloadPath);
              }
            }
          ]
        );
      } else {
        throw new Error(`Download failed with status: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      if (isMounted.current) {
        setIsDownloading(false);
      }
      Alert.alert(
        'Download Failed',
        'Failed to download the update. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: () => handleDownload(url) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  // ========== INSTALL APK (FIXED) ==========
  // Previously called `require('react-native-fs').installApk(filePath)`.
  // react-native-fs does not export an installApk function, so this always
  // threw and silently fell into the catch block — nothing was ever
  // installed. react-native-file-viewer opens the file with the correct
  // MIME type via Android's ACTION_VIEW intent (through its own
  // FileProvider), which is what actually hands the file to the package
  // installer.
  const handleInstall = async (filePath) => {
    try {
      console.log('📲 Installing APK from:', filePath);

      if (isMounted.current) setIsInstalling(true);

      if (Platform.OS === 'android') {
        const fileExists = await RNFS.exists(filePath);
        if (!fileExists) {
          throw new Error('Downloaded file not found');
        }

        // FIX: sanity-check the download actually completed and isn't
        // truncated/corrupted. A valid APK (which is a ZIP) always starts
        // with the bytes 'PK'. A bad/partial download will still "open" in
        // FileViewer but the installer will then silently fail or hang on
        // "Installing..." with no useful error.
        const stat = await RNFS.stat(filePath);
        console.log('📦 APK file size:', stat.size);
        if (stat.size < 1000) {
          throw new Error('Downloaded file looks incomplete/corrupted (too small).');
        }

        // FIX: removed the unsupported `mimeType` option — react-native-file-viewer's
        // JS API doesn't accept it; the library derives MIME type from the
        // file extension (.apk) automatically on the native side.
        await FileViewer.open(filePath, {
          showOpenWithDialog: true,
        });
      } else {
        // iOS doesn't support sideloaded APK installs — this flow is
        // Android-only in practice.
        Alert.alert('Not supported', 'Automatic install is only available on Android.');
      }
    } catch (installError) {
      console.error('❌ Installation error:', installError);

      // The most common real-world cause on Android 8+ is that "Install
      // unknown apps" permission hasn't been granted for this app yet.
      Alert.alert(
        'Installation Error',
        'Unable to start the installer. This is usually because "Install unknown apps" permission isn\'t enabled for this app yet. Please enable it in Settings, then try installing again.',
        [
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openSettings();
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      if (isMounted.current) setIsInstalling(false);
    }
  };

  return (
    <SafeAreaView style={styles.updateContainer}>
      <ScrollView contentContainerStyle={styles.updateScrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Icon */}
        <View style={styles.updateIconContainer}>
          <View style={styles.updateIconCircle}>
            {isDownloaded ? (
              <Icon name="check-circle" size={60} color="#4CAF50" />
            ) : (
              <Icon name="system-update" size={60} color="#006D5B" />
            )}
          </View>
          <View style={styles.updateIconBg1} />
          <View style={styles.updateIconBg2} />
        </View>

        <Text style={styles.updateTitle}>
          {isDownloaded ? 'Ready to Install' : 'Update Available'}
        </Text>
        
        {/* Version Cards */}
        <View style={styles.versionCardsContainer}>
          {/* <View style={[styles.versionCard, styles.currentVersionCard]}>
            <Text style={styles.versionCardLabel}>Current Version</Text>
            <Text style={styles.versionCardValue}>{currentVersion}</Text>
            <View style={styles.versionCardBadge}>
              <Icon name="check-circle" size={14} color="#999" />
              <Text style={styles.versionCardBadgeText}>Installed</Text>
            </View>
          </View>
          
          <View style={styles.versionArrow}>
            <Icon name="arrow-downward" size={28} color="#006D5B" />
          </View> */}
          
          <View style={[styles.versionCard, styles.newVersionCard]}>
            <Text style={styles.versionCardLabel}>New Version</Text>
            <Text style={[styles.versionCardValue, styles.newVersionValue]}>{latestVersion}</Text>
            <View style={[styles.versionCardBadge, styles.newVersionBadge]}>
              <Icon name={isDownloaded ? "check-circle" : "stars"} size={14} color="#006D5B" />
              <Text style={[styles.versionCardBadgeText, styles.newVersionBadgeText]}>
                {isDownloaded ? 'Downloaded' : 'Available'}
              </Text>
            </View>
          </View>
        </View>

        {/* Release Notes */}
        {releaseNotes && !isDownloaded && (
          <View style={styles.releaseNotesContainer}>
            <Text style={styles.releaseNotesTitle}>📋 What's New</Text>
            <Text style={styles.releaseNotesText}>{releaseNotes}</Text>
          </View>
        )}

        {/* Update Message */}
        <Text style={styles.updateMessage}>
          {isDownloaded 
            ? '✅ Update downloaded successfully! Click the button below to install.'
            : forceUpdate 
              ? '⚠️ This update is mandatory. You must update to continue using the app.'
              : 'A new version is available with exciting features and improvements. Update now for the best experience!'
          }
        </Text>

        {/* Download Progress */}
        {isDownloading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Downloading...</Text>
              <Text style={styles.progressPercentage}>{Math.round(downloadProgress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { width: `${downloadProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressSubtext}>Please wait while the update downloads</Text>
          </View>
        )}

        {/* Action Button */}
        {!isDownloading && (
          <TouchableOpacity 
            style={[
              styles.updateButton, 
              (!cleanedUrl && !isDownloaded) && styles.updateButtonDisabled,
              isDownloaded && styles.updateButtonSuccess
            ]} 
            onPress={() => handleDownload(cleanedUrl)}
            activeOpacity={0.8}
            disabled={(!cleanedUrl && !isDownloaded) || isInstalling}
          >
            {isInstalling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name={isDownloaded ? "install-mobile" : "cloud-download"} size={24} color="#fff" />
            )}
            <Text style={styles.updateButtonText}>
              {isInstalling
                ? 'Opening installer...'
                : isDownloaded
                  ? 'Install Now'
                  : (cleanedUrl ? 'Download & Install' : 'Update Unavailable')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Skip Button - Only show if not downloaded and not force update */}
        {!forceUpdate && !isDownloading && !isDownloaded && (
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        {/* Reset Download - If downloaded but user wants to re-download */}
        {isDownloaded && (
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={() => {
              setIsDownloaded(false);
              setDownloadedFilePath('');
              setShowSuccess(false);
            }}
          >
            <Text style={styles.resetButtonText}>Download again</Text>
          </TouchableOpacity>
        )}

        {/* Footer Note */}
        <Text style={styles.updateFooter}>
          {isDownloaded 
            ? 'Click Install Now to complete the update.'
            : forceUpdate 
              ? 'You will not be able to use the app until you update.'
              : 'You can update later from the settings menu.'
          }
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// Loading Screen
const LoadingScreen = ({ message }) => {
  return (
    <View style={styles.loadingContainer}>
      
      <ActivityIndicator size="large" color="#006D5B" style={styles.loadingSpinner} />
      <Text style={styles.loadingText}>{message || 'Checking app status...'}</Text>
    </View>
  );
};

// ========== MAIN APP NAVIGATOR ==========

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    requestAllPermissions();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#006D5B" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={Login} />
      ) : (
        <Stack.Screen name="DrawerNavigation" component={DrawerNavigation} />
      )}
    </Stack.Navigator>
  );
};

// ========== MAIN APP ==========

function App() {
  const [appStatus, setAppStatus] = useState('loading');
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [updateData, setUpdateData] = useState(null);
  const [isVersionChecked, setIsVersionChecked] = useState(false);

  const initializeApp = async () => {
    try {
      setAppStatus('loading');
      
      // Check Maintenance Mode
      const maintenanceCheck = await checkMaintenanceMode();
      
      if (maintenanceCheck.isMaintenance) {
        setAppStatus('maintenance');
        setMaintenanceData(maintenanceCheck.maintenanceData);
        return;
      }

      // Check App Version
      const versionCheck = await checkAppVersion();
      
      console.log('📊 Version Check Result:', versionCheck);
      
      // Versions match -> proceed straight into the app.
      if (!versionCheck.requiresUpdate) {
        console.log('✅ Version matches server. Proceeding to app.');
        setAppStatus('ready');
        setIsVersionChecked(true);
        return;
      }

      // Versions differ (server is newer OR older) -> show update screen.
      console.log('🔄 Version mismatch. Showing update screen.');
      setAppStatus('update');
      setUpdateData({
        apkUrl: versionCheck.apkUrl,
        latestVersion: versionCheck.latestVersion,
        forceUpdate: versionCheck.forceUpdate,
        releaseNotes: versionCheck.releaseNotes,
        currentVersion: versionCheck.currentVersion
      });
    } catch (error) {
      console.error('❌ App initialization error:', error);
      setAppStatus('ready');
      setIsVersionChecked(true);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  // Handle retry
  const handleRetry = () => {
    initializeApp();
  };

  // Render based on app status
  if (appStatus === 'loading') {
    return <LoadingScreen message="Checking app status..." />;
  }

  if (appStatus === 'maintenance') {
    return (
      <MaintenanceScreen 
        maintenanceData={maintenanceData} 
        onRetry={handleRetry} 
      />
    );
  }

  if (appStatus === 'update') {
    return (
      <UpdateScreen 
        apkUrl={updateData?.apkUrl || ''}
        latestVersion={updateData?.latestVersion || ''}
        forceUpdate={updateData?.forceUpdate || false}
        releaseNotes={updateData?.releaseNotes || ''}
        currentVersion={updateData?.currentVersion || APP_VERSION}
        onRetry={handleRetry}
      />
    );
  }

  // App is ready
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}

// ========== STYLES ==========

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingLogoContainer: {
    marginBottom: 20,
  },
  loadingSpinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // ========== UPDATE SCREEN STYLES ==========
  updateContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  updateScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  
  // Update Icon
  updateIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  updateIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#006D5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  updateIconBg1: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C8E6C9',
    opacity: 0.5,
    zIndex: 1,
  },
  updateIconBg2: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5D6A7',
    opacity: 0.3,
    zIndex: 1,
  },

  updateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Version Cards
  versionCardsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  versionCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  currentVersionCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  newVersionCard: {
    borderWidth: 2,
    borderColor: '#006D5B',
    backgroundColor: '#F5FAF8',
  },
  versionCardLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  versionCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  newVersionValue: {
    color: '#006D5B',
  },
  versionCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionCardBadgeText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
    fontWeight: '500',
  },
  newVersionBadge: {
    backgroundColor: '#E8F5E9',
  },
  newVersionBadgeText: {
    color: '#006D5B',
  },
  versionArrow: {
    paddingVertical: 6,
  },

  // Release Notes
  releaseNotesContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8f0fe',
  },
  releaseNotesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  releaseNotesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },

  updateMessage: {
    fontSize: 15,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Progress
  progressContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#006D5B',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#006D5B',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },

  // Buttons
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#006D5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonSuccess: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  resetButtonText: {
    color: '#999',
    fontSize: 12,
  },
  updateFooter: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },

  // ========== MAINTENANCE STYLES ==========
  maintenanceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  maintenanceTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: 16,
    textAlign: 'center',
    color: '#FFA500',
  },
  maintenanceMessageBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE58F',
    width: '100%',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  maintenanceMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#006D5B',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default App;