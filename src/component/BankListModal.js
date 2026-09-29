// components/BankListModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { getBanks, addBank } from '../Api/api';
import Toast from 'react-native-toast-message';

const BankListModal = ({
  visible,
  onClose,
  onSelectBank,
  onAddBank,
  transportId,
  loading,
  amount = '',
  note = '',
}) => {
  const [banks, setBanks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAddBank, setShowAddBank] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [newBank, setNewBank] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    branch: '',
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

  // Fetch banks from API with search
  const fetchBanks = async (search = '') => {
    try {
      setFetching(true);
      const response = await getBanks(search);
      console.log('📋 Bank List Response:', JSON.stringify(response, null, 2));

      if (response.status === true && response.data) {
        setBanks(response.data);
      } else {
        showToast('error', 'Error', response.message || 'Failed to fetch banks');
        setBanks([]);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      showToast('error', 'Error', 'Failed to fetch banks');
      setBanks([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchBanks();
    } else {
      // Reset state when modal closes so it opens fresh next time
      setShowAddBank(false);
      setShowPreview(false);
      setSelectedBank(null);
      setSearchText('');
    }
  }, [visible]);

  // Search handler with debounce
  useEffect(() => {
    if (visible) {
      const delayDebounceFn = setTimeout(() => {
        fetchBanks(searchText);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchText, visible]);

  // Verify IFSC Code using Razorpay API
  const verifyIFSCCode = async (ifsc) => {
    if (!ifsc || ifsc.length < 11) {
      setBankVerified(false);
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);

      if (!response.ok) {
        throw new Error('Invalid IFSC code');
      }

      const data = await response.json();
      console.log('🔍 IFSC Verification Response:', JSON.stringify(data, null, 2));

      if (data && data.IFSC) {
        setBankVerified(true);
        setNewBank((prev) => ({
          ...prev,
          bank_name: data.BANK || '',
          branch: data.BRANCH || '',
        }));
        showToast('success', 'Verified', `Bank: ${data.BANK}, Branch: ${data.BRANCH}`);
      } else {
        setBankVerified(false);
        showToast('error', 'Error', 'Invalid IFSC code');
      }
    } catch (error) {
      console.error('IFSC verification error:', error);
      setBankVerified(false);
      showToast('error', 'Error', 'Invalid IFSC code or network error');
    } finally {
      setVerifying(false);
    }
  };

  // Add new bank - then show list again
  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_holder_name || !newBank.account_number || !newBank.ifsc_code) {
      showToast('error', 'Error', 'Please fill all required fields');
      return;
    }

    if (!bankVerified) {
      showToast('error', 'Error', 'Please verify IFSC code first');
      return;
    }

    try {
      setSubmitting(true);
      const response = await addBank({
        bank_name: newBank.bank_name,
        account_holder_name: newBank.account_holder_name,
        account_number: newBank.account_number,
        ifsc_code: newBank.ifsc_code.toUpperCase(),
        branch: newBank.branch,
      });

      console.log('➕ Add Bank Response:', JSON.stringify(response, null, 2));

      if (response.status === true) {
        showToast('success', 'Success', 'Bank added successfully');
        onAddBank && onAddBank(response.data);

        // Hide add bank form and show bank list
        setShowAddBank(false);
        setNewBank({
          bank_name: '',
          account_holder_name: '',
          account_number: '',
          ifsc_code: '',
          branch: '',
        });
        setBankVerified(false);

        // Refresh bank list with current search
        await fetchBanks(searchText);

        // Show success toast
        showToast('success', 'Bank Added', 'Please select it from the list below');
      } else {
        showToast('error', 'Error', response.message || 'Failed to add bank');
      }
    } catch (error) {
      console.error('Add bank error:', error);
      showToast('error', 'Error', error.message || 'Failed to add bank');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle bank selection with preview
  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setShowPreview(true);
  };

  // Confirm bank selection - log all data
  const confirmBankSelection = () => {
    if (!selectedBank) return;

    const paymentData = {
      bank: selectedBank,
      amount: amount,
      note: note,
      selectedBankId: selectedBank.id,
      bankName: selectedBank.bank_name,
      accountHolder: selectedBank.account_holder_name,
      accountNumber: selectedBank.account_number,
      ifscCode: selectedBank.ifsc_code,
      branch: selectedBank.branch || 'N/A',
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Payment Confirmation Data:', JSON.stringify(paymentData, null, 2));
    console.log('🏦 Selected Bank:', selectedBank);
    console.log('💰 Amount:', amount);
    console.log('📝 Note:', note);

    setShowPreview(false);
    onSelectBank && onSelectBank(selectedBank);
  };

  const renderBankItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bankItem}
      onPress={() => handleBankSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.bankItemLeft}>
        <View style={styles.bankIcon}>
          <MaterialIcons name="account-balance" size={24} color="#006D5B" />
        </View>
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{item.bank_name}</Text>
          <Text style={styles.bankHolder}>{item.account_holder_name}</Text>
          <Text style={styles.bankDetails}>
            A/C: {item.account_number} | IFSC: {item.ifsc_code}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  // Preview Modal with Amount and Note
  const renderPreviewModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showPreview}
      onRequestClose={() => setShowPreview(false)}
    >
      <View style={styles.previewOverlay}>
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Confirm Payment</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedBank && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.previewContent}>
                <View style={styles.previewIconContainer}>
                  <MaterialIcons name="account-balance" size={50} color="#006D5B" />
                </View>

                {/* Payment Details Section */}
                <View style={styles.paymentSection}>
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Amount</Text>
                    <Text style={styles.previewValueAmount}>₹{amount || '0'}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Note</Text>
                    <Text style={styles.previewValue}>{note || 'N/A'}</Text>
                  </View>
                </View>

                {/* Bank Details Section */}
                <View style={styles.bankSection}>
                  <Text style={styles.sectionTitle}>Bank Details</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Bank Name</Text>
                    <Text style={styles.previewValue}>{selectedBank.bank_name}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Account Holder</Text>
                    <Text style={styles.previewValue}>{selectedBank.account_holder_name}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Account Number</Text>
                    <Text style={styles.previewValue}>{selectedBank.account_number}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>IFSC Code</Text>
                    <Text style={styles.previewValue}>{selectedBank.ifsc_code}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Branch</Text>
                    <Text style={styles.previewValue}>{selectedBank.branch || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.previewButtonRow}>
                  <TouchableOpacity
                    style={[styles.previewBtn, styles.previewCancelBtn]}
                    onPress={() => setShowPreview(false)}
                  >
                    <Text style={styles.previewCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.previewBtn, styles.previewConfirmBtn]}
                    onPress={confirmBankSelection}
                  >
                    <Text style={styles.previewConfirmBtnText}>Confirm Payment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showAddBank ? 'Add Bank' : 'Select Bank'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {!showAddBank ? (
            <>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bank by name, holder, or IFSC..."
                  placeholderTextColor="#999"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <MaterialIcons name="close" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {fetching ? (
                <View style={styles.centerLoader}>
                  <ActivityIndicator size="large" color="#006D5B" />
                </View>
              ) : (
                <FlatList
                  data={banks}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderBankItem}
                  contentContainerStyle={styles.bankList}
                  showsVerticalScrollIndicator={true}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MaterialIcons name="account-balance" size={48} color="#ccc" />
                      <Text style={styles.emptyText}>No banks found</Text>
                      <Text style={styles.emptySubText}>Add a new bank to continue</Text>
                    </View>
                  }
                />
              )}

              <TouchableOpacity
                style={styles.addBankBtn}
                onPress={() => setShowAddBank(true)}
                disabled={loading}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.addBankBtnText}>Add New Bank</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView
              style={styles.addBankScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.addBankContent}
            >
              <View style={styles.addBankForm}>
                <Text style={styles.formTitle}>Add New Bank</Text>

                <Text style={styles.formLabel}>IFSC Code *</Text>
                <View style={styles.ifscContainer}>
                  <TextInput
                    style={[styles.formInput, styles.ifscInput]}
                    placeholder="Enter IFSC code (e.g. UCBA0001535)"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                    value={newBank.ifsc_code}
                    onChangeText={(text) => {
                      setNewBank({ ...newBank, ifsc_code: text });
                      setBankVerified(false);
                    }}
                    onBlur={() => {
                      if (newBank.ifsc_code.length >= 11) {
                        verifyIFSCCode(newBank.ifsc_code);
                      }
                    }}
                  />
                  {verifying ? (
                    <ActivityIndicator size="small" color="#006D5B" style={styles.ifscVerifyIcon} />
                  ) : bankVerified ? (
                    <MaterialIcons name="check-circle" size={24} color="#4caf50" style={styles.ifscVerifyIcon} />
                  ) : null}
                </View>
                {verifying && (
                  <Text style={styles.verifyingText}>Verifying IFSC code...</Text>
                )}
                {bankVerified && (
                  <Text style={styles.verifiedText}>✓ IFSC code verified</Text>
                )}

                <Text style={styles.formLabel}>Bank Name *</Text>
                <View style={[styles.formInput, styles.readOnlyInput]}>
                  <Text style={styles.readOnlyText}>
                    {newBank.bank_name || 'Verify IFSC to auto-fill'}
                  </Text>
                </View>

                <Text style={styles.formLabel}>Branch</Text>
                <View style={[styles.formInput, styles.readOnlyInput]}>
                  <Text style={styles.readOnlyText}>
                    {newBank.branch || 'Verify IFSC to auto-fill'}
                  </Text>
                </View>

                <Text style={styles.formLabel}>Account Holder Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter account holder name"
                  placeholderTextColor="#999"
                  value={newBank.account_holder_name}
                  onChangeText={(text) => setNewBank({ ...newBank, account_holder_name: text })}
                />

                <Text style={styles.formLabel}>Account Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter account number"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={newBank.account_number}
                  onChangeText={(text) => setNewBank({ ...newBank, account_number: text })}
                />

                <View style={styles.formButtonRow}>
                  <TouchableOpacity
                    style={[styles.formBtn, styles.cancelBtn]}
                    onPress={() => {
                      setShowAddBank(false);
                      setNewBank({
                        bank_name: '',
                        account_holder_name: '',
                        account_number: '',
                        ifsc_code: '',
                        branch: '',
                      });
                      setBankVerified(false);
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formBtn, styles.saveBtn, (!bankVerified || submitting) && styles.saveBtnDisabled]}
                    onPress={handleAddBank}
                    disabled={!bankVerified || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Bank</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>

      {/* Preview Modal */}
      {renderPreviewModal()}
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
    flex: 1,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  bankList: {
    paddingBottom: 10,
    flexGrow: 1,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bankHolder: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  bankDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  addBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
    flexShrink: 0,
  },
  addBankBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addBankScrollView: {
    flex: 1,
  },
  addBankContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  addBankForm: {
    paddingVertical: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
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
  readOnlyInput: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    color: '#666',
  },
  ifscContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
  },
  ifscInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  ifscVerifyIcon: {
    marginRight: 12,
  },
  verifyingText: {
    fontSize: 12,
    color: '#006D5B',
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
    fontWeight: '600',
  },
  formButtonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  formBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveBtn: {
    backgroundColor: '#006D5B',
  },
  saveBtnDisabled: {
    backgroundColor: '#ccc',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Preview Modal Styles
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '92%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: '90%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  previewContent: {
    paddingVertical: 4,
  },
  previewIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentSection: {
    backgroundColor: '#f0f8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bankSection: {
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  previewValueAmount: {
    fontSize: 16,
    color: '#006D5B',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  previewButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewCancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewConfirmBtn: {
    backgroundColor: '#006D5B',
  },
  previewCancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  previewConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BankListModal;