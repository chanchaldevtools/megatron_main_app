import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getTransactionsLists } from '../../Api/api';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// ========== SKELETON COMPONENT ==========
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
    <Animated.View style={[styles.skeletonCard, { opacity: animatedValue }]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonTextLarge} />
        <View style={styles.skeletonPill} />
      </View>
      <View style={styles.skeletonDivider} />
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonTextLineShort} />
    </Animated.View>
  );
};

const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

// ========== NO DATA COMPONENT ==========
const NoDataComponent = ({ onRefresh }) => {
  return (
    <View style={styles.noDataContainer}>
      <View style={styles.noDataIconWrapper}>
        <View style={styles.noDataIconCircle}>
          <Icon name="receipt-long" size={64} color="#006D5B" />
        </View>
        <View style={styles.noDataIconBg1} />
        <View style={styles.noDataIconBg2} />
        <View style={styles.noDataIconBg3} />
      </View>

      <Text style={styles.noDataTitle}>No Transactions Found</Text>
      <Text style={styles.noDataSubtitle}>
        There are no transactions available at the moment. Pull down to refresh or check back later.
      </Text>

      <TouchableOpacity style={styles.noDataButton} onPress={onRefresh}>
        <Icon name="refresh" size={20} color="#fff" />
        <Text style={styles.noDataButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function AllTransactionScreen() {
  const navigation = useNavigation();
  
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  
  // Refs to prevent multiple API calls
  const isLoadingMore = useRef(false);
  const isRefreshing = useRef(false);

  // Fetch transactions
  const fetchTransactions = async (pageNum = 1, shouldRefresh = false) => {
    try {
      // Set loading states
      if (shouldRefresh) {
        isRefreshing.current = true;
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        if (isLoadingMore.current) return;
        isLoadingMore.current = true;
        setLoadingMore(true);
      }

      const formData = {
        page: pageNum,
        limit: 15, // Match your API's per_page
        status: ''
      };
      
      const response = await getTransactionsLists(formData);
      
      if (response.success) {
        const rawData = response.data || [];
        const meta = response.meta || {};
        
        // Update pagination info from meta object
        const total = meta.total || 0;
        const perPage = meta.per_page || 15;
        const currentPage = meta.current_page || 1;
        const lastPage = meta.last_page || 1;
        
        setTotalPages(lastPage);
        setHasMore(currentPage < lastPage);
        
        console.log(`Page ${currentPage} of ${lastPage}, Total: ${total}, HasMore: ${currentPage < lastPage}`);
        
        // Format data
        const formattedData = rawData.map((item) => ({
          id: item.id?.toString() || Math.random().toString(),
          amount: parseFloat(item.amount || 0),
          amountFormatted: item.amount_formatted || `₹ ${parseFloat(item.amount || 0).toLocaleString()}`,
          status: item.status || 'Pending',
          statusColor: item.status_color || 'yellow',
          by: item.raised_by?.name || 'Unknown',
          raisedBy: item.raised_by,
          updated: item.updated_at_formatted || item.created_at_formatted || 'N/A',
          created: item.created_at_formatted || 'N/A',
          note: item.comment || 'No note',
          paymentMode: item.payment_mode || 'N/A',
          upiId: item.upi_id,
          qrcodeString: item.qrcode_string,
          bankDetails: item.bank_details,
          approvedBy: item.approved_by,
          paidBy: item.paid_by,
          transportId: item.transport_id,
        }));

        // Update transactions
        if (pageNum === 1 || shouldRefresh) {
          setTransactions(formattedData);
        } else {
          // Remove duplicates
          const existingIds = new Set(transactions.map(item => item.id));
          const newItems = formattedData.filter(item => !existingIds.has(item.id));
          setTransactions(prev => [...prev, ...newItems]);
        }
        
        setPage(currentPage);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch transactions');
        if (pageNum > 1) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', error.message || 'Failed to fetch transactions');
      if (pageNum > 1) {
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isLoadingMore.current = false;
      isRefreshing.current = false;
    }
  };

  // Initial load
  useEffect(() => {
    fetchTransactions(1, false);
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (isRefreshing.current) return;
    setExpanded({});
    fetchTransactions(1, true);
  }, []);

  // Load more
  const loadMore = useCallback(() => {
    // Prevent multiple calls
    if (isLoadingMore.current) return;
    if (loadingMore) return;
    if (refreshing) return;
    if (!hasMore) return;
    if (loading) return;
    
    // Check if we've reached total pages
    if (totalPages > 0 && page >= totalPages) {
      setHasMore(false);
      return;
    }
    
    const nextPage = page + 1;
    console.log(`Loading more: page ${nextPage}`);
    fetchTransactions(nextPage, false);
  }, [hasMore, loadingMore, refreshing, loading, page, totalPages]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const navigateToTransportDetail = (transportId) => {
    if (transportId) {
      navigation.navigate('Transactions', { transportId });
    } else {
      Alert.alert('Error', 'Transport ID not found');
    }
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { color: '#f39c12', icon: 'access-time', label: 'Pending' };
      case 'approved':
        return { color: '#4caf50', icon: 'check-circle', label: 'Approved' };
      case 'paid':
        return { color: '#2e7d32', icon: 'check-circle', label: 'Success' };
      case 'issue':
        return { color: '#d32f2f', icon: 'error-outline', label: 'Issue' };
      default:
        return { color: '#999', icon: 'help-outline', label: status || 'Unknown' };
    }
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#006D5B" />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    
    if (!hasMore && transactions.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>No more transactions</Text>
        </View>
      );
    }
    
    return null;
  };

  const renderEmpty = () => {
    if (loading) return null;
    return <NoDataComponent onRefresh={onRefresh} />;
  };

  const renderItem = ({ item }) => {
    const isOpen = expanded[item.id];
    const statusConfig = getStatusConfig(item.status);
    const hasBankDetails = item.bankDetails && Object.keys(item.bankDetails).length > 0;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={styles.amount}>Amount : {item.amountFormatted}, </Text>
            <View style={styles.statusRow}>
              <Icon name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {' '}{statusConfig.label}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleExpand(item.id)}>
            <Icon
              name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={26}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        <Text style={styles.detailText}>By : {item.by}</Text>
        <Text style={styles.detailText}>Created on : {item.created}</Text>
        <Text style={styles.detailText}>Note : {item.note}</Text>

        {isOpen && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.sectionTitle}>Account Details</Text>

            {hasBankDetails ? (
              <>
                <Text style={styles.bankText}>
                  Bank Name : {item.bankDetails.bank_name}, A/C No. : {item.bankDetails.account_number_masked || item.bankDetails.account_number}
                </Text>
                <Text style={styles.bankText}>
                  IFSC Code : {item.bankDetails.ifsc_code}, A/C Holder : {item.bankDetails.account_holder_name}
                </Text>
                {item.bankDetails.branch && (
                  <Text style={styles.bankText}>
                    Branch : {item.bankDetails.branch}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.bankText}>No bank details available</Text>
            )}

            {item.upiId && (
              <Text style={styles.bankText}>UPI ID : {item.upiId}</Text>
            )}
            {item.paymentMode && item.paymentMode !== 'N/A' && (
              <Text style={styles.bankText}>Payment Mode : {item.paymentMode}</Text>
            )}

            {item.approvedBy ? (
              <Text style={styles.approvedText}>Approved by : {item.approvedBy.name}</Text>
            ) : (
              <Text style={styles.notApproved}>Not approved yet</Text>
            )}

            {item.paidBy ? (
              <Text style={styles.paidText}>Paid by : {item.paidBy.name}</Text>
            ) : (
              <Text style={styles.notPaid}>Not paid yet</Text>
            )}

            <TouchableOpacity 
              style={styles.viewDetailsBtn}
              onPress={() => navigateToTransportDetail(item.transportId)}
              activeOpacity={0.8}
            >
              <Icon name="visibility" size={18} color="#fff" />
              <Text style={styles.viewDetailsBtnText}>View Payment Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#006D5B" barStyle="light-content" />
        <SkeletonLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#006D5B" barStyle="light-content" />

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#006D5B']}
            tintColor="#006D5B"
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={15}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },

  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },

  // SKELETON STYLES
  skeletonContainer: {
    padding: 10,
  },
  skeletonCard: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  skeletonDivider: {
    height: 1,
    backgroundColor: '#d6d6d6',
    marginVertical: 6,
  },
  skeletonTextLine: {
    backgroundColor: '#d6d6d6',
    height: 12,
    width: '70%',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonTextLineShort: {
    backgroundColor: '#d6d6d6',
    height: 12,
    width: '45%',
    borderRadius: 4,
    marginTop: 2,
  },

  // NO DATA STYLES
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
    minHeight: height * 0.6,
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

  // FOOTER
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  footerEnd: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerEndText: {
    fontSize: 14,
    color: '#999',
  },

  // CARD STYLES
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  bankText: {
    fontSize: 13,
    color: '#444',
    marginBottom: 2,
  },
  notApproved: {
    color: '#f39c12',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  notPaid: {
    color: '#f39c12',
    textAlign: 'center',
    fontWeight: '500',
  },
  approvedText: {
    color: '#4caf50',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  paidText: {
    color: '#2e7d32',
    textAlign: 'center',
    fontWeight: '500',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    elevation: 2,
  },
  viewDetailsBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});