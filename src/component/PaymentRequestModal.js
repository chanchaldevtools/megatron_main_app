// components/PaymentRequestModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';

const PaymentRequestModal = ({
  visible,
  onClose,
  onSubmit,
  loading,
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedMode, setSelectedMode] = useState(null);
  const [upiId, setUpiId] = useState('');
  
  // Validation error states
  const [errors, setErrors] = useState({
    amount: '',
    selectedMode: '',
    upiId: '',
  });

  const paymentModes = [
    { id: 'bank', label: 'Bank Payment', icon: 'account-balance' },
    { id: 'upi', label: 'UPI Payment', icon: 'payment' },
    { id: 'qr', label: 'QR Code', icon: 'qr-code' },
    { id: 'cash', label: 'Cash', icon: 'attach-money' },
  ];

  // Validate UPI ID format
  const isValidUpiId = (id) => {
    if (!id) return false;
    // Basic UPI ID pattern: something@something
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    return upiPattern.test(id);
  };

  // Clear specific error
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Validate all fields
  const validateFields = () => {
    let isValid = true;
    const newErrors = {
      amount: '',
      selectedMode: '',
      upiId: '',
    };

    // Validate Amount
    if (!amount) {
      newErrors.amount = 'Please enter an amount';
      isValid = false;
    } else if (parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
      isValid = false;
    } else if (isNaN(parseFloat(amount))) {
      newErrors.amount = 'Please enter a valid number';
      isValid = false;
    }

    // Validate Payment Mode
    if (!selectedMode) {
      newErrors.selectedMode = 'Please select a payment mode';
      isValid = false;
    }

    // Validate UPI ID if UPI mode is selected
    if (selectedMode === 'upi') {
      if (!upiId) {
        newErrors.upiId = 'Please enter UPI ID';
        isValid = false;
      } else if (!isValidUpiId(upiId)) {
        newErrors.upiId = 'Invalid UPI ID format. Example: name@upi';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    // Validate all fields
    if (!validateFields()) {
      // Show first error in Alert
      const firstError = 
        errors.amount || 
        errors.selectedMode || 
        errors.upiId;
      
      if (firstError) {
        Alert.alert('Validation Error', firstError);
      }
      return;
    }

    // All validations passed, submit
    onSubmit({
      amount: parseFloat(amount),
      note: note.trim(),
      paymentMode: selectedMode,
      upiId: upiId.trim(),
    });
  };

  // Handle amount change with validation
  const handleAmountChange = (text) => {
    // Allow only numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    setAmount(cleaned);
    clearError('amount');
  };

  // Handle UPI ID change
  const handleUpiChange = (text) => {
    setUpiId(text);
    clearError('upiId');
  };

  // Handle mode selection
  const handleModeSelect = (modeId) => {
    setSelectedMode(modeId);
    clearError('selectedMode');
    if (modeId !== 'upi') {
      setUpiId('');
      clearError('upiId');
    }
  };

  // Get icon color based on selected mode
  const getIconColor = (modeId) => {
    return selectedMode === modeId ? '#006D5B' : '#666';
  };

  // Reset form when modal closes
  const handleClose = () => {
    setAmount('');
    setNote('');
    setSelectedMode(null);
    setUpiId('');
    setErrors({
      amount: '',
      selectedMode: '',
      upiId: '',
    });
    onClose();
  };

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
            <Text style={styles.modalTitle}>Request Payment</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              {/* Amount Input */}
              <Text style={styles.label}>Amount (₹) <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[
                  styles.input,
                  errors.amount ? styles.inputError : null,
                ]}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={handleAmountChange}
                editable={!loading}
              />
              {errors.amount ? (
                <Text style={styles.errorText}>{errors.amount}</Text>
              ) : null}

              {/* Payment Mode Selection */}
              <Text style={[styles.label, { marginTop: 16 }]}>
                Payment Mode <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.modeGrid}>
                {paymentModes.map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.modeCard,
                      selectedMode === mode.id && styles.modeCardActive,
                      errors.selectedMode && !selectedMode && styles.modeCardError,
                    ]}
                    onPress={() => handleModeSelect(mode.id)}
                    disabled={loading}
                  >
                    <MaterialIcons
                      name={mode.icon}
                      size={28}
                      color={getIconColor(mode.id)}
                    />
                    <Text style={[
                      styles.modeLabel,
                      selectedMode === mode.id && styles.modeLabelActive,
                    ]}>
                      {mode.label}
                    </Text>
                    {selectedMode === mode.id && (
                      <View style={styles.checkMark}>
                        <MaterialIcons name="check-circle" size={20} color="#006D5B" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {errors.selectedMode ? (
                <Text style={styles.errorText}>{errors.selectedMode}</Text>
              ) : null}

              {/* UPI Input - shown only when UPI mode is selected */}
              {selectedMode === 'upi' && (
                <View style={styles.upiContainer}>
                  <Text style={styles.label}>
                    UPI ID <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={[
                    styles.upiInputContainer,
                    errors.upiId ? styles.inputError : null,
                  ]}>
                    <MaterialIcons name="payment" size={20} color="#006D5B" />
                    <TextInput
                      style={styles.upiInput}
                      placeholder="Enter UPI ID (e.g. name@upi)"
                      placeholderTextColor="#999"
                      value={upiId}
                      onChangeText={handleUpiChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                  {errors.upiId ? (
                    <Text style={styles.errorText}>{errors.upiId}</Text>
                  ) : (
                    <Text style={styles.upiHint}>
                      Example: example@paytm, example@ybl, example@upi
                    </Text>
                  )}
                </View>
              )}

              {/* Bank Info - shown when Bank is selected */}
              {selectedMode === 'bank' && (
                <View style={styles.infoContainer}>
                  <MaterialIcons name="info" size={20} color="#006D5B" />
                  <Text style={styles.infoText}>
                    You will be prompted to select a bank account in the next step.
                  </Text>
                </View>
              )}

              {/* QR Info - shown when QR is selected */}
              {selectedMode === 'qr' && (
                <View style={styles.infoContainer}>
                  <MaterialIcons name="info" size={20} color="#006D5B" />
                  <Text style={styles.infoText}>
                    You will be prompted to enter or scan QR code in the next step.
                  </Text>
                </View>
              )}

              {/* Cash Info - shown when Cash is selected */}
              {selectedMode === 'cash' && (
                <View style={styles.cashInfoContainer}>
                  <MaterialIcons name="info" size={20} color="#0D47A1" />
                  <Text style={styles.cashInfoText}>
                    Cash payment will be recorded as pending until approved by admin.
                  </Text>
                </View>
              )}

              {/* Note Input */}
              <Text style={[styles.label, { marginTop: 16 }]}>Note (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter note (optional)"
                placeholderTextColor="#999"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  loading && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Continue</Text>
                )}
              </TouchableOpacity>

              {/* Footer note */}
              <Text style={styles.footerNote}>
                * Required fields
              </Text>
            </View>
          </ScrollView>
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
    maxHeight: '85%',
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
  modalBody: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#d32f2f',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f8f8f8',
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    position: 'relative',
  },
  modeCardActive: {
    borderColor: '#006D5B',
    backgroundColor: '#E8F5E9',
  },
  modeCardError: {
    borderColor: '#d32f2f',
  },
  modeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  modeLabelActive: {
    color: '#006D5B',
    fontWeight: '600',
  },
  checkMark: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  // Cash Info Styles
  cashInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  cashInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#0D47A1',
    fontWeight: '500',
  },
  // Info Container for Bank and QR
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#006D5B',
    fontWeight: '500',
  },
  // UPI Input Styles
  upiContainer: {
    marginTop: 12,
  },
  upiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
  },
  upiInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  upiHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitBtn: {
    backgroundColor: '#006D5B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PaymentRequestModal;