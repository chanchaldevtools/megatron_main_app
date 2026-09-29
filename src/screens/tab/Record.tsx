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
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle, Rect, Path, Line } from 'react-native-svg';
import { getTransactionsLists } from '../../Api/api';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
      <View style={styles.noDataGraphicContainer}>
        <Svg width="220" height="220" viewBox="0 0 220 220">
          <Circle cx="110" cy="110" r="95" fill="#E8F5E9" opacity="0.4" />
          <Circle cx="110" cy="110" r="75" fill="#C8E6C9" opacity="0.2" />
          <Rect
            x="55"
            y="40"
            width="110"
            height="130"
            rx="12"
            fill="#ffffff"
            stroke="#006D5B"
            strokeWidth="2.5"
            opacity="0.9"
          />
          <Rect x="55" y="40" width="110" height="25" rx="12" fill="#006D5B" opacity="0.1" />
          <Rect x="72" y="52" width="60" height="5" rx="2.5" fill="#006D5B" opacity="0.2" />
          <Rect x="72" y="75" width="76" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="88" width="55" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="101" width="68" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="114" width="48" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Line x1="72" y1="128" x2="148" y2="128" stroke="#006D5B" strokeWidth="1" opacity="0.1" strokeDasharray="4,4" />
          <Rect x="72" y="138" width="35" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="150" width="50" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Circle cx="170" cy="55" r="16" fill="#006D5B" opacity="0.06" />
          <Circle cx="170" cy="55" r="10" fill="none" stroke="#006D5B" strokeWidth="2" opacity="0.15" />
          <Line x1="177" y1="62" x2="183" y2="68" stroke="#006D5B" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          <Circle cx="40" cy="170" r="14" fill="#006D5B" opacity="0.06" />
          <Line x1="36" y1="170" x2="44" y2="170" stroke="#006D5B" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          <Line x1="40" y1="166" x2="40" y2="174" stroke="#006D5B" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          <Circle cx="35" cy="55" r="3" fill="#006D5B" opacity="0.08" />
          <Circle cx="185" cy="140" r="4" fill="#006D5B" opacity="0.06" />
          <Circle cx="50" cy="120" r="2.5" fill="#006D5B" opacity="0.05" />
          <Circle cx="175" cy="180" r="3.5" fill="#006D5B" opacity="0.04" />
          <Circle cx="30" cy="90" r="2" fill="#006D5B" opacity="0.05" />
          <Circle cx="190" cy="90" r="2.5" fill="#006D5B" opacity="0.04" />
          <Path
            d="M82 160 L88 166 L98 154"
            stroke="#006D5B"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
          />
        </Svg>
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
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Temp filter states for modal
  const [tempFilterStatus, setTempFilterStatus] = useState('');
  const [tempFilterFromDate, setTempFilterFromDate] = useState('');
  const [tempFilterToDate, setTempFilterToDate] = useState('');
  
  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  // Refs to prevent multiple API calls
  const isLoadingMore = useRef(false);
  const isRefreshing = useRef(false);

  // Status options
  const statusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Success', value: 'Success' },
    { label: 'Issue', value: 'Issue' },
  ];

  // Fetch transactions from API - FIXED
  const fetchTransactions = async (isRefreshing = false, pageNum = 1) => {
    try {
      // Prevent concurrent loading
      if (isRefreshing) {
        if (isRefreshing.current) return;
        isRefreshing.current = true;
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        if (isLoadingMore.current) return;
        isLoadingMore.current = true;
        setLoadingMore(true);
      }
      
      // Prepare form data with filters
      const formData = {
        page: pageNum,
        limit: 15, // Match your API's per_page
      };
      
      if (filterStatus) {
        formData.status = filterStatus;
      }
      
      if (filterFromDate) {
        formData.from_date = filterFromDate;
      }
      
      if (filterToDate) {
        formData.to_date = filterToDate;
      }
      
      console.log('📤 Fetching page:', pageNum, 'with filters:', formData);
      
      const response = await getTransactionsLists(formData);
      
      if (response.success) {
        const rawData = response.data || [];
        const meta = response.meta || {};
        
        // Get pagination from meta
        const currentPage = meta.current_page || 1;
        const lastPage = meta.last_page || 1;
        const total = meta.total || 0;
        
        setTotalPages(lastPage);
        setHasMore(currentPage < lastPage);
        
        console.log(`📊 Page ${currentPage}/${lastPage}, Total: ${total}, HasMore: ${currentPage < lastPage}`);
        
        // Format transactions
        const formattedData = rawData.map((item) => ({
          id: item.id?.toString() || Math.random().toString(),
          amount: parseFloat(item.amount || 0),
          amountFormatted: item.amount_formatted || `₹ ${parseFloat(item.amount || 0).toLocaleString()}`,
          status: item.status || 'Pending',
          statusColor: item.status_color || 'yellow',
          by: item.raised_by?.name || 'Unknown',
          updated: item.updated_at_formatted || item.created_at_formatted || 'N/A',
          created: item.created_at_formatted || 'N/A',
          note: item.comment || 'No note',
          paymentMode: item.payment_mode,
          upiId: item.upi_id,
          qrcodeString: item.qrcode_string,
          bankDetails: item.bank_details,
          approvedBy: item.approved_by,
          paidBy: item.paid_by,
          raisedBy: item.raised_by,
          transportId: item.transport_id,
        }));

        // Update transactions - Remove duplicates
        if (pageNum === 1) {
          setTransactions(formattedData);
        } else {
          const existingIds = new Set(transactions.map(item => item.id));
          const newItems = formattedData.filter(item => !existingIds.has(item.id));
          setTransactions((prev) => [...prev, ...newItems]);
        }
        
        setPage(currentPage);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch transactions');
        if (pageNum > 1) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Fetch Transactions Error:', error);
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

  // Initial load with filters
  useEffect(() => {
    resetAndFetch();
  }, [filterStatus, filterFromDate, filterToDate]);

  const resetAndFetch = () => {
    setPage(1);
    setHasMore(true);
    setTransactions([]);
    setTotalPages(1);
    isLoadingMore.current = false;
    isRefreshing.current = false;
    fetchTransactions(false, 1);
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (isRefreshing.current) return;
    setExpanded({});
    resetAndFetch();
  }, [filterStatus, filterFromDate, filterToDate]);

  // Load more for pagination - FIXED
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
    console.log(`⬇️ Loading more: page ${nextPage}`);
    fetchTransactions(false, nextPage);
  }, [hasMore, loadingMore, refreshing, loading, page, totalPages]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Navigate to Transport Detail with transportId
  const navigateToTransportDetail = (transportId) => {
    if (transportId) {
      navigation.navigate('Transactions', { transportId });
    } else {
      Alert.alert('Error', 'Transport ID not found');
    }
  };

  // Get status color and icon
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { color: '#f39c12', icon: 'access-time', label: 'Pending' };
      case 'approved':
        return { color: '#4caf50', icon: 'check-circle', label: 'Approved' };
      case 'paid':
        return { color: '#2e7d32', icon: 'check-circle', label: 'Success' };
      case 'success':
        return { color: '#2e7d32', icon: 'check-circle', label: 'Success' };
      case 'issue':
        return { color: '#d32f2f', icon: 'error-outline', label: 'Issue' };
      default:
        return { color: '#999', icon: 'help-outline', label: status || 'Unknown' };
    }
  };

  // Get status label
  const getStatusLabel = (value) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All';
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Apply filters
  const applyFilters = () => {
    setFilterStatus(tempFilterStatus);
    setFilterFromDate(tempFilterFromDate);
    setFilterToDate(tempFilterToDate);
    setFilterModalVisible(false);
  };

  // Clear filters
  const clearFilters = () => {
    setTempFilterStatus('');
    setTempFilterFromDate('');
    setTempFilterToDate('');
    setFilterStatus('');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterModalVisible(false);
  };

  // Handle From Date selection
  const handleFromDateChange = (event, selected) => {
    setShowFromDatePicker(false);
    if (selected) {
      setFromDate(selected);
      const dateStr = selected.toISOString().split('T')[0];
      setTempFilterFromDate(dateStr);
    }
  };

  // Handle To Date selection
  const handleToDateChange = (event, selected) => {
    setShowToDatePicker(false);
    if (selected) {
      setToDate(selected);
      const dateStr = selected.toISOString().split('T')[0];
      setTempFilterToDate(dateStr);
    }
  };

  // Render footer for pagination loading - FIXED
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

  // Render empty component with NoDataComponent
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
        {/* Top Row */}
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

        {/* Divider */}
        <View style={styles.divider} />

        {/* Details */}
        <Text style={styles.detailText}>By : {item.by}</Text>
        <Text style={styles.detailText}>Created on : {item.created}</Text>
        <Text style={styles.detailText}>Note : {item.note}</Text>

        {/* Expand Section */}
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

            {/* UPI ID if available */}
            {item.upiId && (
              <Text style={styles.bankText}>UPI ID : {item.upiId}</Text>
            )}

            {/* Payment Mode */}
            {item.paymentMode && (
              <Text style={styles.bankText}>Payment Mode : {item.paymentMode}</Text>
            )}

            {/* Approval Status */}
            {item.approvedBy ? (
              <Text style={styles.approvedText}>Approved by : {item.approvedBy.name}</Text>
            ) : (
              <Text style={styles.notApproved}>Not approved yet</Text>
            )}

            {/* Payment Status */}
            {item.paidBy ? (
              <Text style={styles.paidText}>Paid by : {item.paidBy.name}</Text>
            ) : (
              <Text style={styles.notPaid}>Not paid yet</Text>
            )}

            {/* View Payment Details Button */}
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

  // Loading state with skeleton
  if (loading && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#006D5B" barStyle="light-content" />
        <SkeletonLoader />
      </View>
    );
  }

  // Get active filters count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filterStatus) count++;
    if (filterFromDate) count++;
    if (filterToDate) count++;
    return count;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#006D5B" barStyle="light-content" />

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {
            setTempFilterStatus(filterStatus);
            setTempFilterFromDate(filterFromDate);
            setTempFilterToDate(filterToDate);
            setFilterModalVisible(true);
          }}
        >
          <Icon name="filter-list" size={20} color="#006D5B" />
          <Text style={styles.filterButtonText}>Filter</Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {getActiveFilterCount()} active
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {getActiveFilterCount() > 0 && (
          <TouchableOpacity style={styles.clearFilterBtn} onPress={clearFilters}>
            <Icon name="close" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* LIST - FIXED FlatList */}
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.emptyList
        ]}
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

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempFilterStatus === option.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setTempFilterStatus(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilterStatus === option.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* From Date Filter */}
              <Text style={[styles.filterLabel, { marginTop: 16 }]}>From Date</Text>
              <TouchableOpacity 
                style={styles.dateInputContainer}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Icon name="calendar-today" size={20} color="#666" />
                <Text style={tempFilterFromDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                  {tempFilterFromDate ? formatDateDisplay(tempFilterFromDate) : 'Select from date'}
                </Text>
              </TouchableOpacity>

              {showFromDatePicker && (
                <DateTimePicker
                  value={fromDate}
                  mode="date"
                  display="default"
                  onChange={handleFromDateChange}
                />
              )}

              {/* To Date Filter */}
              <Text style={[styles.filterLabel, { marginTop: 12 }]}>To Date</Text>
              <TouchableOpacity 
                style={styles.dateInputContainer}
                onPress={() => setShowToDatePicker(true)}
              >
                <Icon name="calendar-today" size={20} color="#666" />
                <Text style={tempFilterToDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                  {tempFilterToDate ? formatDateDisplay(tempFilterToDate) : 'Select to date'}
                </Text>
              </TouchableOpacity>

              {showToDatePicker && (
                <DateTimePicker
                  value={toDate}
                  mode="date"
                  display="default"
                  onChange={handleToDateChange}
                />
              )}

              {/* Date Range Display */}
              {tempFilterFromDate && tempFilterToDate && (
                <View style={styles.dateRangeDisplay}>
                  <Icon name="date-range" size={16} color="#006D5B" />
                  <Text style={styles.dateRangeText}>
                    {formatDateDisplay(tempFilterFromDate)} - {formatDateDisplay(tempFilterToDate)}
                  </Text>
                </View>
              )}

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ========== FILTER BAR ==========
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  filterBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  filterBadgeText: {
    fontSize: 11,
    color: '#006D5B',
    fontWeight: '500',
  },
  clearFilterBtn: {
    padding: 4,
  },

  // ========== SKELETON STYLES ==========
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
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
    minHeight: height * 0.6,
  },
  noDataGraphicContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Footer Loader
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

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    elevation: 3,
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

  // ========== MODAL STYLES ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#006D5B',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  dateInputPlaceholder: {
    fontSize: 14,
    color: '#999',
    marginLeft: 10,
    flex: 1,
  },
  dateRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  dateRangeText: {
    fontSize: 13,
    color: '#006D5B',
    fontWeight: '500',
    marginLeft: 8,
  },

  // Modal Buttons
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#006D5B',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});