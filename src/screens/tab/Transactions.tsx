// screens/TransportDetail.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  UIManager,
  LayoutAnimation,
  Clipboard,
  ToastAndroid,
  Alert,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getTransactions, submitTransaction, updateTransactionStatus, deleteTransaction } from '../../Api/api';
// Import Modals
import PaymentRequestModal from '../../component/PaymentRequestModal';
import BankListModal from '../../component/BankListModal';
import QRCodeModal from '../../component/QRCodeModal';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Toast from 'react-native-toast-message';
// Real, scannable QR code renderer.
// Install with: npm install react-native-qrcode-svg react-native-svg
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ========== SKELETON COMPONENT ==========
const SkeletonCard = () => {
  const animatedValue = React.useRef(new Animated.Value(0.3)).current;

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
    <Animated.View style={[styles.skeletonCard, { opacity: animatedValue }]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonTextLarge} />
        <View style={styles.skeletonPill} />
      </View>
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonTextLineShort} />
    </Animated.View>
  );
};

const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonSummaryCard}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonCenterLine} />
      <View style={styles.skeletonCenterLine} />
      <View style={styles.skeletonCenterLine} />
    </View>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

// ========== QR PREVIEW MODAL (real, scannable QR) ==========
const buildUpiUri = (rawValue, amount, payeeName = 'Merchant', note = '') => {
  if (!rawValue) return '';

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawValue)) {
    return rawValue;
  }

  const params = new URLSearchParams({
    pa: rawValue,
    pn: payeeName,
    am: amount ? String(amount) : '',
    cu: 'INR',
  });
  if (note) params.append('tn', note);

  return `upi://pay?${params.toString()}`;
};

const QRPreviewModal = ({ visible, onClose, qrValue, amount, payeeName, note }) => {
  const finalValue = buildUpiUri(qrValue, amount, payeeName, note);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.qrModalOverlay}>
        <View style={styles.qrModalCard}>
          <Text style={styles.qrModalTitle}>Payment QR</Text>
          <Text style={styles.qrModalAmount}>₹{amount}</Text>

          <View style={styles.qrPlaceholderBox}>
            {finalValue ? (
              <QRCode
                value={finalValue}
                size={170}
                backgroundColor="#fff"
                color="#000"
                ecl="M"
              />
            ) : (
              <Text style={styles.qrModalValue}>No QR data available</Text>
            )}
          </View>
          <View style={styles.qrModalBtnRow}>
            <TouchableOpacity
              style={[styles.qrModalBtn, styles.qrModalCloseBtn]}
              onPress={onClose}
            >
              <Text style={styles.qrModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ========== CONFIRMATION MODAL COMPONENT ==========
const ConfirmationModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  confirmColor = '#006D5B'
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalCard}>
          <Text style={styles.confirmModalTitle}>{title}</Text>
          <Text style={styles.confirmModalMessage}>{message}</Text>
          <View style={styles.confirmModalBtnRow}>
            <TouchableOpacity
              style={[styles.confirmModalBtn, styles.confirmModalCancelBtn]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.confirmModalBtnText, { color: '#fff' }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmModalBtn, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmModalBtnText}>
                {loading ? 'Processing...' : confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ========== NO DATA COMPONENT ==========
const NoDataComponent = ({ onRefresh, onRequestPayment }) => {
  return (
    <View style={styles.noDataContainer}>
      <View style={styles.noDataIconWrapper}>
        <View style={styles.noDataIconCircle}>
          <MaterialIcons name="receipt-long" size={64} color="#006D5B" />
        </View>
        <View style={styles.noDataIconBg1} />
        <View style={styles.noDataIconBg2} />
        <View style={styles.noDataIconBg3} />
      </View>

      <Text style={styles.noDataTitle}>No Transactions Yet</Text>
      <Text style={styles.noDataSubtitle}>
        There are no transactions for this trip. Click the button below to request a payment.
      </Text>

      <TouchableOpacity style={styles.noDataButton} onPress={onRequestPayment}>
        <MaterialIcons name="add" size={20} color="#fff" />
        <Text style={styles.noDataButtonText}>Request Payment</Text>
      </TouchableOpacity>
    </View>
  );
};

// ========== TRANSACTION CARD COMPONENT ==========
// ========== TRANSACTION CARD COMPONENT ==========
const TransactionCard = ({ item, onApprove, onMarkPaid, onMarkSuccessIssue, onDelete, userRole }) => {
  const [expanded, setExpanded] = useState(false);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is Admin
  const isAdmin = userRole === 'Admin' || userRole === 'admin' || userRole === 'super_admin';

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    Clipboard.setString(text);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`${label} Copied!`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', `${label} copied to clipboard.`);
    }
  };

  const handleAction = (type) => {
    // Only admin can approve, mark paid, mark issue
    if (type !== 'delete' && !isAdmin) {
      Alert.alert('Access Denied', 'Only Admin can perform this action');
      return;
    }
    setModalType(type);
    setConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    setLoading(true);
    try {
      if (modalType === 'approve') {
        await onApprove(item.id);
      } else if (modalType === 'markPaid') {
        await onMarkPaid(item.id);
      } else if (modalType === 'markIssue') {
        await onMarkSuccessIssue(item.id);
      } else if (modalType === 'delete') {
        await onDelete(item.id);
      }
      setConfirmModalVisible(false);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#f5a623';
      case 'approved':
        return '#4caf50';
      case 'paid':
        return '#2e7d32';
      case 'issue':
        return '#f5a623';
      default:
        return '#999';
    }
  };

  const isQRMode = item.paymentMode?.toLowerCase().includes('qr');
  const qrValue = item.qrcodeString || item.upiId || '';
  
  // Get modal title and message based on type
  const getModalContent = () => {
    switch (modalType) {
      case 'approve':
        return {
          title: 'Approve Payment',
          message: `Are you sure you want to approve this payment of ₹${item.amount}?`,
          confirmText: 'Approve',
          confirmColor: '#006D5B'
        };
      case 'markPaid':
        return {
          title: 'Mark as Paid',
          message: `Are you sure you want to mark this payment of ₹${item.amount} as paid?`,
          confirmText: 'Mark Paid',
          confirmColor: '#006D5B'
        };
      case 'markIssue':
        return {
          title: 'Mark Success Issue',
          message: `Are you sure you want to mark this payment as having a success issue?`,
          confirmText: 'Confirm',
          confirmColor: '#f5a623'
        };
      case 'delete':
        return {
          title: 'Delete Transaction',
          message: `Are you sure you want to delete this pending transaction of ₹${item.amount}? This action cannot be undone.`,
          confirmText: 'Delete',
          confirmColor: '#d32f2f'
        };
      default:
        return {
          title: 'Confirm',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          confirmColor: '#006D5B'
        };
    }
  };

  const modalContent = getModalContent();

  return (
    <>
      <TouchableOpacity
        style={styles.txnCard}
        activeOpacity={0.85}
        onPress={toggleExpand}
      >
        <View style={styles.txnHeaderRow}>
          <View style={styles.txnHeaderLeft}>
            <Text style={styles.txnAmount}>₹{item.amount}</Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status == 'paid' ? 'Success' : item.status) },
                ]}
              >
                {item.status == 'Paid' ? 'Success' : item.status}
              </Text>
            </View>
            <Text style={styles.timeText}> {item.createdOn}</Text>
          </View>

          <View style={styles.chevronWrapper}>
            <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </View>

        {expanded && (
          <View style={styles.txnBody}>
            <View style={styles.txnBodyText}>
              {/* UPI ID with Copy */}
              {item.upiId && (
                <View style={styles.inlineCopyRow}>
                  <Text style={styles.txnLine}>UPI ID : {item.upiId}</Text>
                  <TouchableOpacity
                    style={styles.copyBadgeBtn}
                    onPress={() => copyToClipboard(item.upiId, 'UPI ID')}
                  >
                    <Text style={styles.copyBadgeText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bank Details - REDESIGNED */}
              {item.bankDetails && (
                <View style={styles.bankDetailsCard}>
                  <View style={styles.bankDetailsHeader}>
                    <View style={styles.bankIconContainer}>
                      <MaterialIcons name="account-balance" size={20} color="#006D5B" />
                    </View>
                    <Text style={styles.bankDetailsTitle}>
                      {item.bankDetails.bank_name}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBadgeBtn}
                      onPress={() =>
                        copyToClipboard(
                          `Bank: ${item.bankDetails.bank_name}\nAccount: ${item.bankDetails.account_holder_name}\nA/C No: ${item.bankDetails.account_number}\nIFSC: ${item.bankDetails.ifsc_code}\nBranch: ${item.bankDetails.branch}`,
                          'Bank Details'
                        )
                      }
                    >
                      <Text style={styles.copyBadgeText}>Copy All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.bankDetailsBody}>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>Account Holder</Text>
                      <Text style={styles.bankDetailValue}>
                        {item.bankDetails.account_holder_name}
                      </Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>Account Number</Text>
                      <Text style={styles.bankDetailValue}>
                        {item.bankDetails.account_number}
                      </Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>IFSC Code</Text>
                      <Text style={styles.bankDetailValue}>
                        {item.bankDetails.ifsc_code}
                      </Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankDetailLabel}>Branch</Text>
                      <Text style={styles.bankDetailValue}>
                        {item.bankDetails.branch || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.txnLine}>Note : {item.note}</Text>
              <Text style={styles.smallInfoLine}>
                Raised By : {item.raisedBy?.name}
              </Text>
              {item.approvedBy && (
                <Text style={styles.smallInfoLine}>
                  Approved by : {item.approvedBy.name}
                </Text>
              )}

              {item.paidBy && (
                <Text style={styles.smallInfoLine}>
                  Paid by : {item.paidBy.name}
                </Text>
              )}

              <Text style={styles.sumLine}>
                Sum :{' '}
                <Text style={styles.sumPurple}>₹{item.sumBefore}</Text>
                {' - '}
                <Text style={styles.sumGreen}>₹{item.sumDeduct}</Text>
                {' = '}
                <Text style={styles.sumRed}>₹{item.sumAfter}</Text>
              </Text>

              {/* ========== ACTIONS SECTION - FIXED ========== */}
              {item.status === 'Pending' && (
                <View style={styles.actionRowCenter}>
                  {/* Admin Actions - Approve & QR */}
                  {isAdmin && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleAction('approve')}
                      >
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      {isQRMode && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.qrBtn]}
                          onPress={() => setQrPreviewVisible(true)}
                        >
                          <MaterialIcons name="qr-code-2" size={16} color="#fff" />
                          <Text style={[styles.actionBtnText, { marginLeft: 6 }]}>
                            QR
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {/* Delete Button - Visible to BOTH Admin and User */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleAction('delete')}
                  >
                    <MaterialIcons name="delete" size={16} color="#fff" />
                    <Text style={[styles.actionBtnText, { marginLeft: 4 }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Admin Actions for Approved status */}
              {isAdmin && item.status === 'Approved' && (
                <View style={styles.actionRowCenter}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.paidBtn]}
                    onPress={() => handleAction('markPaid')}
                  >
                    <Text style={styles.actionBtnText}>Mark Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.issueBtn]}
                    onPress={() => handleAction('markIssue')}
                  >
                    <Text style={styles.actionBtnText}>Success Issue</Text>
                  </TouchableOpacity>
                  {isQRMode && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.qrBtn]}
                      onPress={() => setQrPreviewVisible(true)}
                    >
                      <MaterialIcons name="qr-code-2" size={16} color="#fff" />
                      <Text style={[styles.actionBtnText, { marginLeft: 6 }]}>
                        QR
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Non-admin view for non-pending status */}
              {!isAdmin && item.status !== 'Pending' && (
                <View style={styles.actionRowCenter}>
                  <View style={styles.viewOnlyBadge}>
                    <MaterialIcons name="info" size={16} color="#666" />
                    <Text style={styles.viewOnlyText}>View Only</Text>
                  </View>
                </View>
              )}

              {item.status === 'Paid' && (
                <View style={styles.actionRowCenter}>
                  <View style={styles.successBadge}>
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#2e7d32"
                    />
                    <Text style={[styles.successBadgeText, { marginLeft: 6 }]}>
                      Payment Completed
                    </Text>
                  </View>
                </View>
              )}

              {item.status === 'Issue' && (
                <View style={styles.actionRowCenter}>
                  <View style={[styles.issueBadge, { backgroundColor: '#ffebee' }]}>
                    <MaterialIcons
                      name="error-outline"
                      size={16}
                      color="#d32f2f"
                    />
                    <Text style={[styles.issueBadgeText, { marginLeft: 6 }]}>
                      Payment Issue
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* QR Preview Modal (per-card) */}
        <QRPreviewModal
          visible={qrPreviewVisible}
          onClose={() => setQrPreviewVisible(false)}
          qrValue={qrValue}
          amount={item.amount}
          payeeName={item.raisedBy?.name || 'Merchant'}
          note={item.note !== 'N/A' ? item.note : ''}
        />
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmAction}
        title={modalContent.title}
        message={modalContent.message}
        confirmText={modalContent.confirmText}
        confirmColor={modalContent.confirmColor}
        loading={loading}
      />
    </>
  );
};

// ========== MAIN COMPONENT ==========
export default function TransportDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const transportId = route.params?.transportId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trip, setTrip] = useState(null);
  const [transactionsList, setTransactionsList] = useState([]);
  const [userRole, setUserRole] = useState('User');

  // Modal States
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [qrCodeString, setQrCodeString] = useState('');

  // Use refs to store latest values for immediate access
  const paymentAmountRef = useRef('');
  const paymentNoteRef = useRef('');

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

  // Load user role
  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setUserRole(userData.role || 'User');
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  useEffect(() => {
    fetchTransactionsData(transportId);
  }, [transportId]);

  // Update refs when states change
  useEffect(() => {
    paymentAmountRef.current = paymentAmount;
  }, [paymentAmount]);

  useEffect(() => {
    paymentNoteRef.current = paymentNote;
  }, [paymentNote]);

  const fetchTransactionsData = async (id, isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      const response = await getTransactions(id);

      if (response.success) {
        const transport = response.transport || {};
        const rawTransactions = response.data || [];

        const formatDate = (dateStr) => {
          if (!dateStr) return 'N/A';
          const d = new Date(dateStr);
          return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        };

        const totalAmount = transport.total_amount || 0;
        const totalPaidSoFar = rawTransactions.reduce(
          (sum, t) => sum + parseFloat(t.amount || 0),
          0
        );

        setTrip({
          route: `${transport.source_place || ''} to ${transport.destination_place || ''}`,
          billNo: transport.bill_number || 'N/A',
          vehicleNo: transport.vehicle_number || 'N/A',
          tripId: transport.trip_id || 'N/A',
          dpDate: formatDate(transport.transport_date),
          addedBy: 'Admin',
          totalWeight: transport.material_weight || '0',
          amountPerTon: transport.rate_per_ton || '0',
          total: totalAmount.toFixed(2),
          due: (totalAmount - totalPaidSoFar).toFixed(2),
        });

        const formattedTxns = rawTransactions.map((item, index) => {
          const sumBefore =
            index === 0
              ? totalAmount
              : totalAmount -
                rawTransactions
                  .slice(0, index)
                  .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

          const sumDeduct = parseFloat(item.amount || 0);
          const sumAfter = sumBefore - sumDeduct;

          return {
            id: item.id.toString(),
            amount: item.amount,
            status: item.status,
            createdOn: item.created_at_formatted || 'N/A',
            note: item.comment || 'N/A',
            sumBefore: sumBefore.toFixed(2),
            sumDeduct: sumDeduct.toFixed(2),
            sumAfter: sumAfter.toFixed(2),
            paymentMode: item.payment_mode,
            upiId: item.upi_id,
            qrcodeString: item.qrcode_string,
            bankDetails: item.bank_details,
            approvedBy: item.approved_by,
            paidBy: item.paid_by,
            raisedBy: item.raised_by,
          };
        });

        setTransactionsList(formattedTxns);
      }
    } catch (error) {
      console.error('API Fetch Error:', error);
      showToast('error', 'Error', 'Failed to fetch transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactionsData(transportId, true);
  }, [transportId]);

  // ========== API CALL HANDLERS ==========
  
  // Approve Payment
  const handleApprove = async (transactionId) => {
    try {
      const response = await updateTransactionStatus(transactionId, 'Approved');
      if (response.status === true || response.success === true) {
        showToast('success', 'Success', 'Payment approved successfully');
        await fetchTransactionsData(transportId);
        return true;
      } else {
        showToast('error', 'Error', response.message || 'Failed to approve payment');
        return false;
      }
    } catch (error) {
      console.error('Approve error:', error);
      showToast('error', 'Error', error.message || 'Failed to approve payment');
      return false;
    }
  };

  // Mark as Paid
  const handleMarkPaid = async (transactionId) => {
    try {
      const response = await updateTransactionStatus(transactionId, 'Paid');
      if (response.status === true || response.success === true) {
        showToast('success', 'Success', 'Payment marked as paid successfully');
        await fetchTransactionsData(transportId);
        return true;
      } else {
        showToast('error', 'Error', response.message || 'Failed to mark as paid');
        return false;
      }
    } catch (error) {
      console.error('Mark paid error:', error);
      showToast('error', 'Error', error.message || 'Failed to mark as paid');
      return false;
    }
  };

  // Mark Success Issue
  const handleMarkSuccessIssue = async (transactionId) => {
    try {
      const response = await updateTransactionStatus(transactionId, 'Issue');
      if (response.status === true || response.success === true) {
        showToast('success', 'Success', 'Payment marked as success issue');
        await fetchTransactionsData(transportId);
        return true;
      } else {
        showToast('error', 'Error', response.message || 'Failed to mark as success issue');
        return false;
      }
    } catch (error) {
      console.error('Mark success issue error:', error);
      showToast('error', 'Error', error.message || 'Failed to mark as success issue');
      return false;
    }
  };

  // ========== DELETE TRANSACTION ==========
  const handleDeleteTransaction = async (transactionId) => {
    try {
      // Find the transaction to check if it's pending
      const transaction = transactionsList.find(t => t.id === transactionId);
      
      if (!transaction) {
        showToast('error', 'Error', 'Transaction not found');
        return false;
      }

      // Only allow deletion if status is Pending
      if (transaction.status !== 'Pending') {
        showToast('error', 'Error', 'Only pending transactions can be deleted');
        return false;
      }

      const response = await deleteTransaction(transactionId);
      
      if (response.status === true || response.success === true) {
        showToast('success', 'Success', 'Transaction deleted successfully');
        await fetchTransactionsData(transportId);
        return true;
      } else {
        showToast('error', 'Error', response.message || 'Failed to delete transaction');
        return false;
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('error', 'Error', error.message || 'Failed to delete transaction');
      return false;
    }
  };

  // ========== HANDLE UPLOAD PHOTO - Navigate to Documents ==========
  const handleUploadPhoto = () => {
    if (transportId) {
      navigation.navigate('Documents', {
        transportId: transportId,
      });
    } else {
      showToast('error', 'Error', 'Transport ID not found');
    }
  };

  // ========== PAYMENT HANDLERS ==========
  const handleRequestPayment = () => {
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = (data) => {
    setPaymentAmount(data.amount.toString());
    setPaymentNote(data.note || '');
    setSelectedPaymentMode(data.paymentMode);
    setPaymentModalVisible(false);

    paymentAmountRef.current = data.amount.toString();
    paymentNoteRef.current = data.note || '';

    if (data.paymentMode === 'bank') {
      setBankModalVisible(true);
    } else if (data.paymentMode === 'qr') {
      setQrModalVisible(true);
    } else if (data.paymentMode === 'upi') {
      setUpiId(data.upiId || '');
      submitPaymentRequest(
        'upi',
        { upi_id: data.upiId },
        data.amount.toString(),
        data.note || ''
      );
    } else if (data.paymentMode === 'cash') {
      submitPaymentRequest('cash', {}, data.amount.toString(), data.note || '');
    }
  };

  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setBankModalVisible(false);
    submitPaymentRequest('bank', { bank_id: bank.id, bank_details: bank });
  };

  const handleAddBank = (bankData) => {
    console.log('Adding bank:', bankData);
    showToast('success', 'Success', 'Bank added successfully');
    setBankModalVisible(false);
  };

  const handleQRCodeSave = (qrData) => {
    console.log('QR Data:', qrData);
    setQrCodeString(qrData.qr_string || qrData.upi_id || '');
    setQrModalVisible(false);
    submitPaymentRequest('qr', {
      qrcode_string: qrData.qr_string || qrData.upi_id || '',
      upi_id: qrData.upi_id || '',
    });
  };

  const submitPaymentRequest = async (
    mode,
    data,
    directAmount = null,
    directNote = null
  ) => {
    setLoadingSubmit(true);
    try {
      const amount = directAmount !== null ? directAmount : paymentAmountRef.current;
      const note = directNote !== null ? directNote : paymentNoteRef.current;

      const payload = {
        transport_id: transportId,
        payment_mode:
          mode === 'bank'
            ? 'Bank'
            : mode === 'upi'
            ? 'UPI'
            : mode === 'cash'
            ? 'Cash'
            : 'QRCode',
        amount: amount,
        comment: note || '',
        status: 'Pending',
      };

      if (mode === 'bank' && data.bank_details) {
        payload.bank_name = data.bank_details.bank_name;
        payload.account_holder_name = data.bank_details.account_holder_name;
        payload.account_number = data.bank_details.account_number;
        payload.ifsc_code = data.bank_details.ifsc_code;
        payload.branch = data.bank_details.branch || '';
        payload.bank_id = data.bank_details.id;
      }

      if (mode === 'upi' && data.upi_id) {
        payload.upi_id = data.upi_id;
      }

      if (mode === 'qr') {
        if (data.qrcode_string) {
          payload.qrcode_string = data.qrcode_string;
        }
        if (data.upi_id) {
          payload.upi_id = data.upi_id;
        }
      }

      const response = await submitTransaction(payload);

      if (response.status === true || response.success === true) {
        showToast('success', 'Success', 'Payment request submitted successfully');
        await fetchTransactionsData(transportId);
        setPaymentAmount('');
        setPaymentNote('');
        setSelectedPaymentMode(null);
        setSelectedBank(null);
        setUpiId('');
        setQrCodeString('');
        paymentAmountRef.current = '';
        paymentNoteRef.current = '';
      } else {
        showToast('error', 'Error', response.message || 'Failed to submit payment');
      }
    } catch (error) {
      console.error('Submit payment error:', error);
      showToast('error', 'Error', error.message || 'Failed to submit payment request');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={transactionsList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#006D5B']}
            tintColor="#006D5B"
            title="Pull to refresh"
            titleColor="#666"
          />
        }
        ListHeaderComponent={
          trip ? (
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.routeTitle}>{trip.route}</Text>

                <View style={styles.billRow}>
                  <Text style={styles.billText}>Bill No. : {trip.billNo}</Text>
                  <TouchableOpacity
                    onPress={handleUploadPhoto}
                    style={styles.cameraBtn}
                  >
                    <MaterialIcons name="photo-camera" size={24} color="#006D5B" />
                    <Text style={styles.cameraLabel}>Upload</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.centerLine}>
                  <Text style={styles.boldText}>Vehicle No : {trip.vehicleNo}</Text>
                  {'  '}Trip Id : {trip.tripId}
                </Text>

                <Text style={styles.centerLine}>
                  D. P. Date : {trip.dpDate}, Added By : {trip.addedBy}
                </Text>

                <Text style={styles.centerLine}>
                  Total Weight : {trip.totalWeight} Ton, Amount/ Ton :{' '}
                  {trip.amountPerTon} Rs
                </Text>

                <View style={styles.divider} />

                <View style={styles.totalDueRow}>
                  <Text style={styles.totalText}>Total : ₹{trip.total} Rs</Text>
                  <Text style={styles.dueText}>Due : ₹{trip.due} Rs</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Transaction History</Text>
            </>
          ) : null
        }
        renderItem={({ item }) => (
          <TransactionCard 
            item={item} 
            onApprove={handleApprove}
            onMarkPaid={handleMarkPaid}
            onMarkSuccessIssue={handleMarkSuccessIssue}
            onDelete={handleDeleteTransaction}
            userRole={userRole}
          />
        )}
        ListFooterComponent={
          transactionsList.length === 0 ? (
            <NoDataComponent 
              onRefresh={onRefresh}
              onRequestPayment={handleRequestPayment}
            />
          ) : (
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.requestBtn}
                activeOpacity={0.85}
                onPress={handleRequestPayment}
              >
                <Text style={styles.requestBtnText}>Request Payment</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* ========== PAYMENT MODALS ========== */}
      <PaymentRequestModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSubmit={handlePaymentSubmit}
        loading={loadingSubmit}
      />

      <BankListModal
        visible={bankModalVisible}
        onClose={() => {
          setBankModalVisible(false);
          if (!selectedBank) {
            fetchTransactionsData(transportId);
          }
        }}
        onSelectBank={handleBankSelect}
        amount={paymentAmount}
        note={paymentNote}
        transportId={transportId}
        onAddBank={handleAddBank}
        loading={loadingSubmit}
        paymentMode="bank"
      />

      <QRCodeModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        onSaveQR={handleQRCodeSave}
        amount={paymentAmount}
        loading={loadingSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    marginTop: -30,
  },
  headerContainer: {
    backgroundColor: '#006D5B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
  },

  // Skeleton Loader Styles
  skeletonContainer: {
    padding: 10,
  },
  skeletonSummaryCard: {
    backgroundColor: '#e0e0e0',
    height: 150,
    borderRadius: 6,
    marginBottom: 16,
    padding: 12,
  },
  skeletonTitle: {
    backgroundColor: '#d6d6d6',
    height: 20,
    width: '60%',
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 4,
  },
  skeletonCenterLine: {
    backgroundColor: '#d6d6d6',
    height: 14,
    width: '80%',
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 4,
  },
  skeletonCard: {
    backgroundColor: '#e0e0e0',
    height: 80,
    borderRadius: 6,
    marginBottom: 12,
    padding: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  skeletonTextLarge: {
    backgroundColor: '#d6d6d6',
    height: 18,
    width: '40%',
    borderRadius: 4,
  },
  skeletonPill: {
    backgroundColor: '#d6d6d6',
    height: 18,
    width: '25%',
    borderRadius: 10,
  },
  skeletonTextLine: {
    backgroundColor: '#d6d6d6',
    height: 12,
    width: '70%',
    borderRadius: 4,
  },
  skeletonTextLineShort: {
    backgroundColor: '#d6d6d6',
    height: 12,
    width: '45%',
    borderRadius: 4,
    marginTop: 6,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  billText: {
    fontSize: 15,
    color: '#222222',
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  cameraLabel: {
    fontSize: 12,
    color: '#006D5B',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  centerLine: {
    fontSize: 14,
    color: '#222222',
    textAlign: 'center',
    marginBottom: 3,
  },
  boldText: {
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#cccccc',
    marginVertical: 8,
  },
  totalDueRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  totalText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#388e3c',
  },
  dueText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d32f2f',
  },

  sectionLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#333333',
    marginVertical: 8,
  },

  // Transaction History Card
  txnCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  txnHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  txnAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chevronWrapper: {
    padding: 4,
  },
  chevron: {
    fontSize: 12,
    color: '#555555',
  },
  txnBody: {
    marginTop: 8,
  },
  txnBodyText: {
    flex: 1,
  },
  txnLine: {
    fontSize: 13.5,
    color: '#111111',
    marginBottom: 2,
  },

  // Bank Details - REDESIGNED
  bankDetailsCard: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e1e8f0',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  bankDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8f0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  bankIconContainer: {
    backgroundColor: '#e8f5e9',
    padding: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  bankDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#006D5B',
    flex: 1,
  },
  bankDetailsBody: {
    gap: 6,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankDetailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  bankDetailValue: {
    fontSize: 12,
    color: '#111',
    fontWeight: '600',
  },

  // Inline Copy Row & Button
  inlineCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyBadgeBtn: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 6,
  },
  copyBadgeText: {
    fontSize: 10.5,
    color: '#1976d2',
    fontWeight: 'bold',
  },

  smallInfoLine: {
    fontSize: 12,
    color: '#555555',
    marginTop: 2,
    fontStyle: 'italic',
  },
  sumLine: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555555',
    marginTop: 6,
    textAlign: 'center',
  },
  sumPurple: {
    color: '#5c38bc',
  },
  sumGreen: {
    color: '#388e3c',
  },
  sumRed: {
    color: '#d32f2f',
  },

  // Centered Actions Row
  actionRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'nowrap',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  approveBtn: {
    backgroundColor: '#006D5B',
  },
  paidBtn: {
    backgroundColor: '#006D5B',
  },
  issueBtn: {
    backgroundColor: '#f5a623',
  },
  qrBtn: {
    backgroundColor: '#1976d2',
  },
  deleteBtn: {
    backgroundColor: '#d32f2f',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
  },
  successBadgeText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Main Action Button
  buttonWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  requestBtn: {
    backgroundColor: '#006D5B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  requestBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
  },

  // QR Preview Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalCard: {
    width: '82%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  qrModalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#006D5B',
    marginTop: 4,
    marginBottom: 12,
  },
  qrPlaceholderBox: {
    width: 180,
    height: 180,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  qrModalValue: {
    fontSize: 11,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  qrModalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  qrModalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  qrModalCloseBtn: {
    backgroundColor: '#888',
  },
  qrModalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmModalCancelBtn: {
    backgroundColor: '#888',
  },
  confirmModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Issue Badge Styles
  issueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#ffebee',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  issueBadgeText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // ========== NO DATA COMPONENT STYLES ==========
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
    minHeight: height * 0.5,
  },
  noDataIconWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  noDataIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#006D5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  noDataIconBg1: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C8E6C9',
    opacity: 0.5,
    zIndex: 1,
  },
  noDataIconBg2: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5D6A7',
    opacity: 0.3,
    zIndex: 1,
  },
  noDataIconBg3: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#81C784',
    opacity: 0.2,
    zIndex: 0,
  },
  noDataTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  noDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#006D5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  noDataButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TransportDetail;