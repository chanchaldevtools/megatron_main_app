// screens/DocumentGallery.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Dimensions,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { getDocumentTypes, ImageUrls, uploadDocument, getTransportDocuments } from '../../Api/api';
import Toast from 'react-native-toast-message';
import ImageViewer from 'react-native-image-zoom-viewer';
import RNFS from 'react-native-fs';
import { PermissionsAndroid } from 'react-native';
import Share from 'react-native-share';
// FIX: added for reliably opening downloaded files on Android/iOS
// npm install react-native-file-viewer
import FileViewer from 'react-native-file-viewer';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 36) / 2;

// ========== SKELETON LOADER COMPONENT ==========
const SkeletonCard = () => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  return (
    <Animated.View style={[styles.card, { opacity: animatedValue }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonTextShort} />
    </Animated.View>
  );
};

const SkeletonGallery = () => (
  <View style={styles.skeletonGrid}>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

// ========== MAIN COMPONENT ==========
export default function DocumentGallery({ route }) {
  const { transportId } = route?.params || {};
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [docTypeModalVisible, setDocTypeModalVisible] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [sharing, setSharing] = useState(false);

  // Validation error states
  const [errors, setErrors] = useState({
    documentType: '',
    file: '',
  });

  // Show Toast function
  const showToast = (type, text1, text2) => {
    Toast.show({
      type: type,
      text1: text1,
      text2: text2,
      position: 'bottom',
      visibilityTime: 3000,
      autoHide: true,
      bottomOffset: 50,
    });
  };

  // Clear error
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Check and request storage permission
  const checkStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          ];

          const granted = await PermissionsAndroid.requestMultiple(permissions);

          const allGranted = Object.values(granted).every(
            result => result === PermissionsAndroid.RESULTS.GRANTED
          );

          if (allGranted) {
            return true;
          } else {
            const hasAnyGranted = Object.values(granted).some(
              result => result === PermissionsAndroid.RESULTS.GRANTED
            );
            if (hasAnyGranted) {
              return true;
            }
            showToast('error', 'Permission Denied', 'Storage permission is required');
            return false;
          }
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'App needs access to storage to share and download files.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
          } else {
            showToast('error', 'Permission Denied', 'Storage permission is required');
            return false;
          }
        }
      } catch (err) {
        console.warn('Permission error:', err);
        showToast('error', 'Error', 'Failed to get permission');
        return false;
      }
    }
    return true;
  };

  // ========== SHARE DOCUMENT AS FILE ==========
  const shareDocumentAsFile = async (fileUrl, fileName, fileId) => {
    try {
      setSharing(true);
      setDownloadingFileId(fileId);

      if (Platform.OS === 'android') {
        const hasPermission = await checkStoragePermission();
        if (!hasPermission) {
          setSharing(false);
          return;
        }
      }

      showToast('info', 'Preparing', 'Downloading file for sharing...');

      const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      let localPath;

      if (Platform.OS === 'android') {
        const externalDir = RNFS.ExternalStorageDirectoryPath;
        const downloadDir = `${externalDir}/Download`;
        const dirExists = await RNFS.exists(downloadDir);
        if (!dirExists) {
          await RNFS.mkdir(downloadDir);
        }
        localPath = `${downloadDir}/${safeFileName}`;
      } else {
        localPath = `${RNFS.DocumentDirectoryPath}/${safeFileName}`;
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: fileUrl,
        toFile: localPath,
        progress: (res) => {
          const progress = Math.round((res.bytesWritten / res.contentLength) * 100);
          setDownloadProgress(progress);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        const shareOptions = {
          title: 'Share Document',
          url: `file://${localPath}`,
          type: 'application/octet-stream',
          failOnCancel: false,
        };

        const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (isImage) {
          shareOptions.type = 'image/*';
        } else if (fileName.match(/\.pdf$/i)) {
          shareOptions.type = 'application/pdf';
        } else if (fileName.match(/\.(doc|docx)$/i)) {
          shareOptions.type = 'application/msword';
        }

        const result = await Share.open(shareOptions);

        if (result) {
          showToast('success', 'Success', 'Document shared successfully');
        }
      } else {
        showToast('error', 'Error', 'Failed to prepare file for sharing');
      }
    } catch (error) {
      console.error('Share error:', error);
      if (error.message && error.message.includes('User cancelled')) {
        console.log('User cancelled sharing');
      } else {
        showToast('error', 'Error', 'Failed to share document: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setSharing(false);
      setDownloadProgress(0);
      setDownloadingFileId(null);
    }
  };

  // Fetch document types
  const fetchDocumentTypes = async () => {
    try {
      const response = await getDocumentTypes();
      if (response.status && response.data) {
        setDocumentTypes(response.data);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    if (!transportId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getTransportDocuments(transportId);

      if (response.status && response.data) {
        setDocuments(response.data);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
      fetchDocumentTypes();
      return () => {};
    }, [transportId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    return ImageUrls ? `${ImageUrls}${fileUrl}` : fileUrl;
  };

  const isImageFile = (fileUrl) => {
    if (!fileUrl) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const extension = fileUrl.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension);
  };

  // ========== OPEN DOWNLOADED FILE (FIXED) ==========
  // Previously tried a hand-built content://media/... URI (invalid — MediaStore
  // content URIs need a real row id, not just the filename) and then a raw
  // file:// URI (throws FileUriExposedException on Android 7+ because it
  // isn't routed through a FileProvider). react-native-file-viewer handles
  // both the FileProvider plumbing and picking an app to open the file with.
  const openDownloadedFile = async (filePath) => {
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        showToast('error', 'Error', 'File not found');
        return;
      }

      await FileViewer.open(filePath, { showOpenWithDialog: true });
    } catch (error) {
      console.error('Error opening file:', error);
      showToast(
        'error',
        'No app found',
        'Please open the file from your device file manager instead.'
      );
    }
  };

  const downloadDocument = async (fileUrl, fileName, fileId) => {
    try {
      if (downloading) {
        showToast('info', 'Info', 'Already downloading a file');
        return;
      }

      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        return;
      }

      setDownloading(true);
      setDownloadingFileId(fileId);
      setDownloadProgress(0);

      const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      let downloadPath;

      if (Platform.OS === 'android') {
        const externalDir = RNFS.ExternalStorageDirectoryPath;
        downloadPath = `${externalDir}/Download/${safeFileName}`;
        const downloadDir = `${externalDir}/Download`;
        const dirExists = await RNFS.exists(downloadDir);
        if (!dirExists) {
          await RNFS.mkdir(downloadDir);
        }
      } else {
        downloadPath = `${RNFS.DocumentDirectoryPath}/${safeFileName}`;
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: fileUrl,
        toFile: downloadPath,
        progress: (res) => {
          const progress = Math.round((res.bytesWritten / res.contentLength) * 100);
          setDownloadProgress(progress);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        setDownloading(false);
        setDownloadingFileId(null);
        setDownloadProgress(100);

        const fileNameFromPath = downloadPath.split('/').pop();
        showToast('success', 'Download Complete', `Saved to Download/${fileNameFromPath}`);

        Alert.alert(
          'Download Complete',
          `File saved to: Download/${fileNameFromPath}`,
          [
            {
              text: 'Open File',
              onPress: () => {
                // FIX: close the preview modal first (if open) so the opened
                // file/app isn't stacked behind our still-visible modal.
                setPreviewModalVisible(false);
                openDownloadedFile(downloadPath);
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );

        setDownloadProgress(0);
      } else {
        setDownloading(false);
        setDownloadingFileId(null);
        setDownloadProgress(0);
        showToast('error', 'Error', 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloading(false);
      setDownloadingFileId(null);
      setDownloadProgress(0);
      showToast('error', 'Error', 'Failed to download file: ' + error.message);
    }
  };

  const openPreview = (item) => {
    const fileUrl = getFileUrl(item.file_url);
    if (!fileUrl) {
      showToast('error', 'Error', 'No file URL available');
      return;
    }

    setSelectedDocument(item);

    if (isImageFile(item.file_url)) {
      setPreviewImageUrl(fileUrl);
      setPreviewModalVisible(true);
    } else {
      Alert.alert(
        'Document Options',
        `${item.document_name || 'Document'}\n\nFile: ${item.file_name}\nSize: ${item.file_size_formatted}`,
        [
          {
            text: 'Open in Browser',
            onPress: () => {
              Linking.openURL(fileUrl).catch(() => {
                showToast('error', 'Error', 'Cannot open file');
              });
            },
          },
          {
            text: 'Share',
            onPress: () => shareDocumentAsFile(fileUrl, item.file_name, item.id),
          },
          {
            text: 'Download',
            onPress: () => downloadDocument(fileUrl, item.file_name, item.id),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const renderDocCard = ({ item }) => {
    const fileUrl = getFileUrl(item.file_url);
    const isImage = fileUrl && isImageFile(item.file_url);
    const isThisFileDownloading = downloadingFileId === item.id;
    const isSharing = sharing && downloadingFileId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => openPreview(item)}
      >
        <View style={styles.thumbnailContainer}>
          {fileUrl && isImage ? (
            <Image
              source={{ uri: fileUrl }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={styles.fileIconContainer}>
              {item.file_extension?.toLowerCase() === 'pdf' ? (
                <MaterialIcons name="picture-as-pdf" size={50} color="#d32f2f" />
              ) : item.file_extension?.toLowerCase() === 'doc' || item.file_extension?.toLowerCase() === 'docx' ? (
                <MaterialIcons name="description" size={50} color="#1976d2" />
              ) : item.file_extension?.toLowerCase() === 'xls' || item.file_extension?.toLowerCase() === 'xlsx' ? (
                <MaterialIcons name="table-chart" size={50} color="#2e7d32" />
              ) : (
                <MaterialIcons name="insert-drive-file" size={50} color="#666" />
              )}
              <Text style={styles.fileExtension}>
                {item.file_extension?.toUpperCase() || 'FILE'}
              </Text>
            </View>
          )}
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>
              {item.document_type?.name || 'DOC'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.docTitle} numberOfLines={1}>
            {item.document_name || item.name || 'Document'}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.docMeta} numberOfLines={1}>
              {item.file_name || 'N/A'}
            </Text>
            <Text style={styles.docMeta}>
              {item.file_size_formatted || 'N/A'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, (isSharing || sharing) && styles.actionBtnDisabled]}
              onPress={() => shareDocumentAsFile(fileUrl, item.file_name, item.id)}
              disabled={isSharing || sharing}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#006D5B" />
              ) : (
                <MaterialIcons name="share" size={18} color="#006D5B" />
              )}
              <Text style={styles.actionBtnText}>
                {isSharing ? 'Sharing...' : 'Share'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, (downloading && downloadingFileId !== item.id) && styles.actionBtnDisabled]}
              onPress={() => downloadDocument(fileUrl, item.file_name, item.id)}
              disabled={downloading && downloadingFileId !== item.id}
            >
              {isThisFileDownloading ? (
                <>
                  <ActivityIndicator size="small" color="#006D5B" />
                  <Text style={styles.actionBtnText}>{downloadProgress}%</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="download" size={18} color="#006D5B" />
                  <Text style={styles.actionBtnText}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ========== RENDER DOCUMENT TYPE MODAL WITH VALIDATION ==========
  const renderDocTypeModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={docTypeModalVisible}
      onRequestClose={() => {
        setDocTypeModalVisible(false);
        setErrors({ documentType: '', file: '' });
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIndicator} />
          <Text style={styles.modalTitle}>Upload Document</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Document Type Selection */}
            <Text style={styles.label}>
              Document Type <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.docTypeGrid}>
              {documentTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.docTypeOption,
                    selectedDocumentType?.id === type.id && styles.docTypeOptionActive,
                    errors.documentType && !selectedDocumentType && styles.docTypeOptionError,
                  ]}
                  onPress={() => {
                    setSelectedDocumentType(type);
                    clearError('documentType');
                  }}
                >
                  <Text style={[
                    styles.docTypeText,
                    selectedDocumentType?.id === type.id && styles.docTypeTextActive,
                  ]}>
                    {type.name}
                  </Text>
                  {selectedDocumentType?.id === type.id && (
                    <MaterialIcons name="check-circle" size={20} color="#006D5B" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.documentType ? (
              <Text style={styles.errorText}>{errors.documentType}</Text>
            ) : null}

            {/* File Info */}
            {selectedFile && (
              <View style={styles.fileInfoContainer}>
                <MaterialIcons name="attach-file" size={20} color="#006D5B" />
                <Text style={styles.fileInfoText} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileSizeText}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedFile(null);
                    clearError('file');
                  }}
                >
                  <MaterialIcons name="close" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            )}
            {errors.file ? (
              <Text style={styles.errorText}>{errors.file}</Text>
            ) : null}

            {/* Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => {
                  setDocTypeModalVisible(false);
                  setErrors({ documentType: '', file: '' });
                }}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.uploadModalBtn,
                  (!selectedDocumentType || !selectedFile || uploading) && styles.uploadModalBtnDisabled
                ]}
                onPress={handleUpload}
                disabled={!selectedDocumentType || !selectedFile || uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.uploadModalBtnText}>
                    {selectedFile ? 'Upload' : 'Select File First'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.footerNote}>
              * Required fields
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ========== UPLOAD DOCUMENT WITH VALIDATION ==========
  const handleUpload = async () => {
    // Validate document type
    if (!selectedDocumentType) {
      setErrors(prev => ({ ...prev, documentType: 'Please select a document type' }));
      showToast('error', 'Validation Error', 'Please select a document type');
      return;
    }

    // Validate file
    if (!selectedFile) {
      setErrors(prev => ({ ...prev, file: 'Please select a file to upload' }));
      showToast('error', 'Validation Error', 'Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('transport_id', transportId);
      formData.append('document_type_id', selectedDocumentType.id);

      const fileObject = {
        uri: selectedFile.uri,
        type: selectedFile.type || 'image/jpeg',
        name: selectedFile.name || 'file.jpg',
      };
      formData.append('file', fileObject);

      console.log('📤 Uploading file:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        transportId: transportId,
        documentTypeId: selectedDocumentType.id,
      });

      const response = await uploadDocument(formData);

      if (response.status === true) {
        showToast('success', 'Success', 'Document uploaded successfully');
        await fetchDocuments();
        setSelectedFile(null);
        setSelectedDocumentType(null);
        setErrors({ documentType: '', file: '' });
        setDocTypeModalVisible(false);
      } else {
        showToast('error', 'Error', response.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', 'Error', error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // ========== RENDER IMAGE PREVIEW (FIXED) ==========
  const renderImagePreview = () => {
    if (!previewImageUrl) return null;

    const images = [{
      url: previewImageUrl,
      props: {
        source: { uri: previewImageUrl }
      }
    }];

    const isThisDownloading = downloading && downloadingFileId === selectedDocument?.id;
    const isThisSharing = sharing && downloadingFileId === selectedDocument?.id;

    return (
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <ImageViewer
          imageUrls={images}
          enableSwipeDown={true}
          onSwipeDown={() => setPreviewModalVisible(false)}
          onCancel={() => setPreviewModalVisible(false)}
          enableImageZoom={true}
          renderHeader={() => (
            // FIX: pointerEvents="box-none" so the ImageViewer's full-screen
            // pan responder (used for pinch/zoom/swipe) doesn't swallow taps
            // meant for the header buttons.
            <View style={styles.previewHeader} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setPreviewModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedDocument?.document_name || 'Image'}
              </Text>
              <View style={styles.previewActions} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.previewActionBtn}
                  onPress={() => shareDocumentAsFile(
                    previewImageUrl,
                    selectedDocument?.file_name,
                    selectedDocument?.id
                  )}
                  disabled={sharing}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isThisSharing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="share" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewActionBtn}
                  onPress={() => downloadDocument(
                    previewImageUrl,
                    selectedDocument?.file_name,
                    selectedDocument?.id
                  )}
                  disabled={downloading && downloadingFileId !== selectedDocument?.id}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isThisDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="download" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {/* FIX: progress feedback rendered *inside* the modal — the
                  main-screen DownloadProgressBar sits behind this Modal's
                  own native root and is invisible while previewing. */}
              {(isThisDownloading || isThisSharing) && (
                <View style={styles.previewProgressOverlay} pointerEvents="none">
                  <Text style={styles.previewProgressText}>
                    {isThisSharing ? 'Preparing…' : 'Downloading…'} {downloadProgress}%
                  </Text>
                </View>
              )}
            </View>
          )}
          renderFooter={() => (
            <View style={styles.previewFooter} pointerEvents="none">
              <Text style={styles.previewFooterText}>
                {selectedDocument?.file_name || 'Image'}
              </Text>
              <Text style={styles.previewFooterText}>
                {selectedDocument?.file_size_formatted || ''}
              </Text>
            </View>
          )}
        />
      </Modal>
    );
  };

  // ========== PICKERS ==========
  const pickFromCamera = () => {
    setModalVisible(false);
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: true,
    };
    launchCamera(options, handleFileResponse);
  };

  const pickFromGallery = () => {
    setModalVisible(false);
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    };
    launchImageLibrary(options, handleFileResponse);
  };

  const pickFile = () => {
    setModalVisible(false);
    DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
      allowMultiSelection: false,
    })
      .then((results) => {
        if (results && results[0]) {
          const file = results[0];
          setSelectedFile({
            uri: file.uri,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
          });
          clearError('file');
          setDocTypeModalVisible(true);
        }
      })
      .catch((err) => {
        if (DocumentPicker.isCancel(err)) {
          console.log('User cancelled');
        } else {
          console.error('Error picking file:', err);
          showToast('error', 'Error', 'Failed to pick file');
        }
      });
  };

  const handleFileResponse = (response) => {
    if (response.didCancel) {
      console.log('User cancelled');
      return;
    }
    if (response.error) {
      console.log('ImagePicker Error: ', response.error);
      showToast('error', 'Error', 'Failed to pick image');
      return;
    }
    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      });
      clearError('file');
      setDocTypeModalVisible(true);
    }
  };

  // ========== DOWNLOAD PROGRESS BAR (main screen only) ==========
  const DownloadProgressBar = () => {
    if (!downloading && !sharing) return null;
    // Don't double up with the in-modal overlay when the preview is open.
    if (previewModalVisible) return null;

    const label = sharing ? 'Preparing for share' : 'Downloading';
    const progress = downloadProgress;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{label}... {progress}%</Text>
      </View>
    );
  };

  // ========== MAIN RETURN ==========
  return (
    <SafeAreaView style={styles.screen}>
      <DownloadProgressBar />

      {loading ? (
        <SkeletonGallery />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={renderDocCard}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="folder-open" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No documents found</Text>
              <Text style={styles.emptySubText}>Upload your first document</Text>
            </View>
          }
          style={styles.flatList}
        />
      )}

      {/* FAB Button */}
      <TouchableOpacity
        style={[styles.fab, uploading && styles.fabDisabled]}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <MaterialIcons name="add" size={30} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Upload Option Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Upload Document</Text>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={pickFromCamera}
            >
              <MaterialIcons name="camera-alt" size={24} color="#006D5B" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={pickFromGallery}
            >
              <MaterialIcons name="photo-library" size={24} color="#006D5B" />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={pickFile}
            >
              <MaterialIcons name="description" size={24} color="#006D5B" />
              <Text style={styles.optionText}>Select PDF / File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Document Type Selection Modal */}
      {renderDocTypeModal()}

      {/* Image Preview Modal */}
      {renderImagePreview()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    top: -30,
    backgroundColor: '#f8f9fa',
  },

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#006D5B',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#006D5B',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: 'bold',
  },

  // List & Grid Layout
  listContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  flatList: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: COLUMN_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: '#eef2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fileIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileExtension: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: 'bold',
  },
  typeTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#000000aa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: 10,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  docMeta: {
    fontSize: 11,
    color: '#666666',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 11,
    color: '#006D5B',
    fontWeight: '500',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#006D5B',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  fabDisabled: {
    opacity: 0.7,
  },

  // Skeleton Styles
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
  },
  skeletonImage: {
    height: 120,
    backgroundColor: '#d6d6d6',
  },
  skeletonTextLine: {
    height: 14,
    backgroundColor: '#d6d6d6',
    borderRadius: 4,
    margin: 8,
  },
  skeletonTextShort: {
    height: 10,
    width: '50%',
    backgroundColor: '#d6d6d6',
    borderRadius: 4,
    marginLeft: 8,
    marginBottom: 12,
  },

  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cccccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  cancelModalBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelModalBtnText: {
    fontSize: 15,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 4,
  },

  // Document Type Modal
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#d32f2f',
    fontWeight: '700',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  docTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  docTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#f5f5f5',
    minWidth: '45%',
    flex: 1,
  },
  docTypeOptionActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#006D5B',
  },
  docTypeOptionError: {
    borderColor: '#d32f2f',
  },
  docTypeText: {
    fontSize: 14,
    color: '#333',
  },
  docTypeTextActive: {
    color: '#006D5B',
    fontWeight: 'bold',
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadModalBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#006D5B',
  },
  uploadModalBtnDisabled: {
    backgroundColor: '#cccccc',
  },
  uploadModalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  fileSizeText: {
    fontSize: 11,
    color: '#666',
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },

  // Preview Modal Styles
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  closeBtn: {
    padding: 8,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 12,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewActionBtn: {
    padding: 8,
  },
  // FIX: in-modal progress indicator (visible while the preview Modal is up,
  // unlike the main-screen DownloadProgressBar which renders behind it)
  previewProgressOverlay: {
    position: 'absolute',
    bottom: -34,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewProgressText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  previewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  previewFooterText: {
    color: '#fff',
    fontSize: 14,
  },
});