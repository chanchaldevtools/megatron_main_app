// components/QRCodeModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  AppState,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import QRCode from 'react-native-qrcode-svg';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Toast from 'react-native-toast-message';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const QRCodeModal = ({
  visible,
  onClose,
  onSaveQR,
  amount: initialAmount,
  transportId,
}) => {
  const [step, setStep] = useState('scan');
  const [scannedQRData, setScannedQRData] = useState('');
  const [qrData, setQrData] = useState({
    upi_id: '',
    amount: initialAmount || '',
    note: '',
    payee_name: '',
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  
  const device = useCameraDevice('back');
  const appState = useRef(AppState.currentState);
  const scannerRef = useRef(null);

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

  // Check and request camera permission
  useEffect(() => {
    const checkPermission = async () => {
      if (visible) {
        setLoading(true);
        try {
          const status = await Camera.getCameraPermissionStatus();
          console.log('📷 Camera permission status:', status);
          
          if (status === 'not-determined') {
            const newStatus = await Camera.requestCameraPermission();
            console.log('📷 New permission status:', newStatus);
            setHasPermission(newStatus === 'granted');
          } else {
            setHasPermission(status === 'granted');
          }
        } catch (error) {
          console.error('❌ Permission check error:', error);
          setHasPermission(false);
        } finally {
          setLoading(false);
        }
      }
    };
    
    checkPermission();
  }, [visible]);

  // Control camera activation
  useEffect(() => {
    if (visible && step === 'scan' && hasPermission && device) {
      console.log('📷 Activating camera');
      setIsCameraActive(true);
    } else {
      setIsCameraActive(false);
    }
  }, [visible, step, hasPermission, device]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (visible && step === 'scan' && hasPermission && device) {
          setIsCameraActive(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [visible, step, hasPermission, device]);

  // QR Code Scanner
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      console.log('📱 QR Scanned:', codes);
      if (scanning && codes.length > 0 && codes[0].value) {
        setScanning(false);
        setIsCameraActive(false);
        handleQRScan(codes[0].value);
      }
    },
  });

  // Extract UPI details from scanned QR
  const extractUPIDetails = (qrString) => {
    try {
      console.log('🔍 Processing QR String:', qrString);
      
      if (!qrString) {
        showToast('error', 'Error', 'Empty QR data');
        return null;
      }

      if (!qrString.includes('upi://')) {
        showToast('error', 'Invalid QR', 'Please scan a valid UPI QR code');
        return null;
      }

      const params = {};
      const urlParts = qrString.split('?');
      if (urlParts.length > 1) {
        urlParts[1].split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value !== undefined) {
            params[key] = decodeURIComponent(value);
          }
        });
      }

      console.log('📋 Extracted params:', params);

      const upiId = params.pa || '';
      const payeeName = params.pn || '';
      const amount = params.am || '';
      const note = params.tn || '';

      let extractedUpiId = upiId;
      if (!extractedUpiId) {
        const vpaMatch = qrString.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)/);
        if (vpaMatch) {
          extractedUpiId = vpaMatch[1];
        }
      }

      if (!extractedUpiId) {
        showToast('error', 'Error', 'Could not find UPI ID in QR code');
        return null;
      }

      return {
        upi_id: extractedUpiId,
        payee_name: payeeName,
        amount: amount,
        note: note,
        raw_data: qrString,
      };
    } catch (error) {
      console.error('❌ Error extracting UPI details:', error);
      showToast('error', 'Error', 'Failed to extract UPI details from QR code');
      return null;
    }
  };

  const handleQRScan = (qrString) => {
    const extracted = extractUPIDetails(qrString);
    if (extracted) {
      setScannedQRData(qrString);
      setQrData({
        upi_id: extracted.upi_id || '',
        amount: initialAmount || extracted.amount || '',
        note: extracted.note || '',
        payee_name: extracted.payee_name || '',
      });
      
      setStep('generate');
      showToast('success', 'QR Scanned', `UPI ID: ${extracted.upi_id}`);
    }
  };

  const handleGenerateQR = () => {
    if (!qrData.upi_id) {
      showToast('error', 'Error', 'Please enter UPI ID');
      return;
    }
    if (!qrData.amount || parseFloat(qrData.amount) <= 0) {
      showToast('error', 'Error', 'Please enter a valid amount');
      return;
    }

    let upiString = `upi://pay?pa=${qrData.upi_id}`;
    if (qrData.payee_name) {
      upiString += `&pn=${encodeURIComponent(qrData.payee_name)}`;
    }
    upiString += `&am=${parseFloat(qrData.amount).toFixed(2)}`;
    upiString += `&cu=INR`;
    if (qrData.note) {
      upiString += `&tn=${encodeURIComponent(qrData.note)}`;
    }
    upiString += `&mode=00`;

    setScannedQRData(upiString);
    setStep('preview');
  };

  const handleSaveQR = () => {
    const finalData = {
      transport_id: transportId,
      upi_id: qrData.upi_id,
      payee_name: qrData.payee_name,
      amount: qrData.amount,
      note: qrData.note,
      qr_string: scannedQRData,
      is_fixed_amount: true,
      generated_at: new Date().toISOString(),
    };

    console.log('========================================');
    console.log('💾 QR CODE SAVED');
    console.log('========================================');
    console.log('🚚 Transport ID:', finalData.transport_id);
    console.log('💳 UPI ID:', finalData.upi_id);
    console.log('👤 Payee:', finalData.payee_name || 'N/A');
    console.log('💰 Amount:', `₹${parseFloat(finalData.amount).toFixed(2)} (FIXED)`);
    console.log('📝 Note:', finalData.note || 'No note');
    console.log('⏰ Generated at:', new Date().toLocaleString('en-IN'));
    console.log('========================================\n');

    onSaveQR(finalData);
    onClose();
  };

  const resetState = () => {
    setStep('scan');
    setScannedQRData('');
    setScanning(true);
    setCameraReady(false);
    setQrData({
      upi_id: '',
      amount: initialAmount || '',
      note: '',
      payee_name: '',
    });
  };

  const handleClose = () => {
    setIsCameraActive(false);
    resetState();
    onClose();
  };

  // Render loading state
  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Loading Camera...</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#006D5B" />
              <Text style={styles.loadingText}>Initializing camera...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Render scan step
  const renderScanStep = () => (
    <View style={styles.scanContainer}>
      <Text style={styles.scanTitle}>Scan Customer's QR Code</Text>
      <Text style={styles.scanSubtitle}>
        Ask customer to show their PhonePe/Google Pay QR code
      </Text>
      
      <View style={styles.amountDisplayContainer}>
        <Text style={styles.amountDisplayLabel}>Amount to Collect:</Text>
        <Text style={styles.amountDisplayValue}>₹ {parseFloat(qrData.amount || 0).toFixed(2)}</Text>
        <Text style={styles.amountDisplayFixed}>🔒 Amount is FIXED</Text>
      </View>

      <Text style={[styles.fixedAmountNote, { color: '#F44336', marginBottom: 16 }]}>
        Amount will be FIXED - Customer cannot change it
      </Text>

      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={60} color="#006D5B" />
          <Text style={styles.permissionText}>
            Camera permission is required to scan QR codes
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              setLoading(true);
              try {
                const status = await Camera.requestCameraPermission();
                setHasPermission(status === 'granted');
              } catch (error) {
                console.error('Permission request error:', error);
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : !device ? (
        <View style={styles.permissionContainer}>
          <MaterialIcons name="warning" size={60} color="#FF9800" />
          <Text style={styles.permissionText}>No camera device found</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleClose}
          >
            <Text style={styles.permissionButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cameraWrapper}>
            <Camera
              ref={scannerRef}
              style={styles.camera}
              device={device}
              isActive={isCameraActive}
              codeScanner={codeScanner}
              onInitialized={() => {
                console.log('✅ Camera initialized successfully');
                setCameraReady(true);
              }}
              onError={(error) => {
                console.error('❌ Camera error:', error);
              }}
            />
            <View style={styles.scanFrameOverlay}>
              <View style={styles.scanFrame} />
            </View>
            <Text style={styles.scanFrameText}>
              Align QR code within the frame
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => {
              // Show manual entry options using Alert.prompt
              const alertMessage = 'Enter UPI details manually:';
              // Using Alert.prompt is fine for simple text input
              // We keep this as is since it's a text input prompt
              Alert.prompt(
                'Manual Entry',
                'Enter UPI details manually:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Enter UPI ID',
                    onPress: (upiId) => {
                      if (upiId) {
                        setQrData({ ...qrData, upi_id: upiId });
                        setStep('generate');
                      }
                    },
                  },
                  {
                    text: 'Paste Example',
                    onPress: () => {
                      const exampleQR = 'upi://pay?pa=rajkumarlaha228-1@oksbi&pn=Raj%20kumar%20Laha&aid=uGICAgICTo8ajdg';
                      handleQRScan(exampleQR);
                    }
                  }
                ],
                'plain-text'
              );
            }}
          >
            <Text style={styles.manualEntryText}>Enter UPI ID Manually</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // Render generate step
  const renderGenerateStep = () => (
    <View style={styles.generateContainer}>
      <View style={styles.generateHeader}>
        <Text style={styles.scanTitle}>Edit Payment Details</Text>
        {scannedQRData && scannedQRData.includes('upi://') && (
          <View style={styles.scannedBadge}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.scannedBadgeText}>QR Scanned</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.scanSubtitle}>
        {scannedQRData ? 'Edit details or enter amount to proceed' : 'Enter UPI details to generate QR'}
      </Text>

      <Text style={styles.formLabel}>UPI ID *</Text>
      <TextInput
        style={styles.formInput}
        placeholder="Enter UPI ID (e.g., name@upi)"
        placeholderTextColor="#999"
        value={qrData.upi_id}
        onChangeText={(text) => setQrData({ ...qrData, upi_id: text })}
      />

      <Text style={styles.formLabel}>Payee Name</Text>
      <TextInput
        style={styles.formInput}
        placeholder="Enter payee name"
        placeholderTextColor="#999"
        value={qrData.payee_name}
        onChangeText={(text) => setQrData({ ...qrData, payee_name: text })}
      />

      <Text style={styles.formLabel}>Amount (₹) *</Text>
      <View style={styles.amountReadonlyContainer}>
        <TextInput
          style={[styles.formInput, styles.amountInput, styles.readonlyInput]}
          placeholder="Enter amount"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={qrData.amount}
          editable={false}
          onChangeText={(text) => setQrData({ ...qrData, amount: text })}
        />
        <View style={styles.readonlyBadge}>
          <Text style={styles.readonlyBadgeText}>FIXED</Text>
        </View>
      </View>
      <Text style={styles.fixedAmountHint}>
        ⚠️ This amount is FIXED - Customer cannot change it
      </Text>

      <Text style={styles.formLabel}>Note (Optional)</Text>
      <TextInput
        style={[styles.formInput, styles.textArea]}
        placeholder="Enter payment note"
        placeholderTextColor="#999"
        value={qrData.note}
        onChangeText={(text) => setQrData({ ...qrData, note: text })}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={styles.generateQRBtn}
        onPress={handleGenerateQR}
      >
        <MaterialIcons name="qr-code" size={24} color="#fff" />
        <Text style={styles.generateQRBtnText}>Generate Fixed Amount QR</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backScanBtn}
        onPress={() => {
          setStep('scan');
          setScanning(true);
          setIsCameraActive(true);
        }}
      >
        <Text style={styles.backScanBtnText}>← Scan QR Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render preview step
  const renderPreviewStep = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.scanTitle}>QR Code Preview</Text>
      <Text style={styles.previewSubtitle}>
        Amount: ₹{parseFloat(qrData.amount || 0).toFixed(2)} (Fixed)
      </Text>
      
      <View style={styles.qrPreviewBox}>
        {scannedQRData && scannedQRData.includes('upi://') ? (
          <QRCode
            value={scannedQRData}
            size={200}
            backgroundColor="white"
            color="#006D5B"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <MaterialIcons name="qr-code" size={120} color="#ccc" />
            <Text style={styles.qrPlaceholderText}>No QR generated</Text>
          </View>
        )}
      </View>

      <View style={styles.previewDetails}>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Transport ID:</Text>
          <Text style={styles.previewValue}>{transportId || 'N/A'}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>UPI ID:</Text>
          <Text style={styles.previewValue}>{qrData.upi_id || 'N/A'}</Text>
        </View>
        
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Payee:</Text>
          <Text style={styles.previewValue}>{qrData.payee_name || 'N/A'}</Text>
        </View>
        
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Amount:</Text>
          <Text style={[styles.previewValue, styles.amountValue]}>
            ₹ {parseFloat(qrData.amount || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.fixedBadge}>
          <MaterialIcons name="lock" size={16} color="#fff" />
          <Text style={styles.fixedBadgeText}>Amount is FIXED</Text>
        </View>
        
        {qrData.note && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Note:</Text>
            <Text style={styles.previewValue}>{qrData.note}</Text>
          </View>
        )}
      </View>

      <View style={styles.previewButtons}>
        <TouchableOpacity
          style={[styles.previewBtn, styles.editBtn]}
          onPress={() => setStep('generate')}
        >
          <MaterialIcons name="edit" size={20} color="#006D5B" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.previewBtn, styles.saveBtn]}
          onPress={handleSaveQR}
        >
          <MaterialIcons name="save" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Save QR Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 'scan' ? 'Scan QR Code' : 
               step === 'generate' ? 'Generate QR Code' : 
               'QR Code Preview'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {step === 'scan' && renderScanStep()}
          {step === 'generate' && renderGenerateStep()}
          {step === 'preview' && renderPreviewStep()}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  amountDisplayContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  amountDisplayLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  amountDisplayValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#006D5B',
    marginVertical: 4,
  },
  amountDisplayFixed: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: 'bold',
  },
  amountReadonlyContainer: {
    position: 'relative',
  },
  readonlyInput: {
    backgroundColor: '#f0f0f0',
    color: '#333',
  },
  readonlyBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readonlyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scanContainer: {
    paddingVertical: 8,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  fixedAmountNote: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 12,
  },
  permissionButton: {
    backgroundColor: '#006D5B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraWrapper: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginVertical: 12,
  },
  camera: {
    flex: 1,
  },
  scanFrameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanFrameText: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    color: '#fff',
    textAlign: 'center',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
  },
  manualEntryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#006D5B',
    borderRadius: 8,
    marginTop: 8,
  },
  manualEntryText: {
    color: '#006D5B',
    fontSize: 14,
    fontWeight: '600',
  },
  generateContainer: {
    paddingVertical: 8,
  },
  generateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  scannedBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 10,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f8f8f8',
  },
  amountInput: {
    borderColor: '#006D5B',
    borderWidth: 2,
    fontWeight: 'bold',
  },
  fixedAmountHint: {
    fontSize: 11,
    color: '#F44336',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  generateQRBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  generateQRBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backScanBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backScanBtnText: {
    color: '#006D5B',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    paddingVertical: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#006D5B',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  qrPreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  previewDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006D5B',
  },
  fixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 6,
    gap: 6,
  },
  fixedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveBtn: {
    backgroundColor: '#006D5B',
  },
  editBtnText: {
    color: '#006D5B',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QRCodeModal;