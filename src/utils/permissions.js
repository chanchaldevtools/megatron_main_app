import { PermissionsAndroid, Platform } from 'react-native';

export const requestAllPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 33) {
      // Android 13+ Granular Permissions
      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Legacy Android (Android 12 and lower)
      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );
    }
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
};