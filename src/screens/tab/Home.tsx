// screens/TripPaymentCards.js - COMPLETE FIXED VERSION WITH NO DATA GRAPHIC
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Keyboard,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Svg, { Circle, Rect, Path, Line } from 'react-native-svg';
import { getTransports, getTransportById, updateTransport, submitTransaction } from '../../Api/api';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';

import PaymentRequestModal from '../../component/PaymentRequestModal';
import BankListModal from '../../component/BankListModal';
import QRCodeModal from '../../component/QRCodeModal';

const { width, height } = Dimensions.get('window');

// ---- Skeleton Loading Component ----
const SkeletonCard = () => {
  const animatedValue = new Animated.Value(0.3);
  
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const opacity = animatedValue;

  const SkeletonItem = ({ style }) => (
    <Animated.View style={[style, { opacity, backgroundColor: '#e0e0e0', borderRadius: 4 }]} />
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonItem style={{ height: 16, width: '60%' }} />
        <SkeletonItem style={{ height: 24, width: 40 }} />
      </View>
      <View style={styles.divider} />
      <View style={styles.rowWrap}>
        <SkeletonItem style={{ height: 12, width: '45%' }} />
        <SkeletonItem style={{ height: 12, width: '35%', marginLeft: 8 }} />
      </View>
      <View style={styles.rowWrap}>
        <SkeletonItem style={{ height: 12, width: '40%' }} />
        <SkeletonItem style={{ height: 12, width: '30%', marginLeft: 8 }} />
      </View>
      <View style={styles.rowWrap}>
        <SkeletonItem style={{ height: 14, width: '30%' }} />
        <SkeletonItem style={{ height: 14, width: '30%', marginLeft: 12 }} />
      </View>
      <View style={styles.buttonRow}>
        <SkeletonItem style={{ height: 30, flex: 1, marginRight: 6 }} />
        <SkeletonItem style={{ height: 30, flex: 1, marginRight: 6 }} />
        <SkeletonItem style={{ height: 30, flex: 1 }} />
      </View>
    </View>
  );
};

// ---- No Data Component with Graphic ----
const NoDataComponent = ({ onRefresh, onClearFilters, hasFilters }) => {
  return (
    <View style={styles.noDataContainer}>
      {/* Custom SVG Graphic */}
      <View style={styles.noDataGraphicContainer}>
        <Svg width="220" height="220" viewBox="0 0 220 220">
          {/* Background gradient circles */}
          <Circle cx="110" cy="110" r="95" fill="#E8F5E9" opacity="0.4" />
          <Circle cx="110" cy="110" r="75" fill="#C8E6C9" opacity="0.2" />
          
          {/* Main Card/Receipt */}
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
          
          {/* Card header */}
          <Rect x="55" y="40" width="110" height="25" rx="12" fill="#006D5B" opacity="0.1" />
          
          {/* Receipt lines */}
          <Rect x="72" y="52" width="60" height="5" rx="2.5" fill="#006D5B" opacity="0.2" />
          
          {/* Content lines */}
          <Rect x="72" y="75" width="76" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="88" width="55" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="101" width="68" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="114" width="48" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          
          {/* Divider line */}
          <Line x1="72" y1="128" x2="148" y2="128" stroke="#006D5B" strokeWidth="1" opacity="0.1" strokeDasharray="4,4" />
          
          {/* Bottom section */}
          <Rect x="72" y="138" width="35" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          <Rect x="72" y="150" width="50" height="4" rx="2" fill="#006D5B" opacity="0.12" />
          
          {/* Decorative elements - floating */}
          {/* Search icon */}
          <Circle cx="170" cy="55" r="16" fill="#006D5B" opacity="0.06" />
          <Circle cx="170" cy="55" r="10" fill="none" stroke="#006D5B" strokeWidth="2" opacity="0.15" />
          <Line x1="177" y1="62" x2="183" y2="68" stroke="#006D5B" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          
          {/* Plus icon */}
          <Circle cx="40" cy="170" r="14" fill="#006D5B" opacity="0.06" />
          <Line x1="36" y1="170" x2="44" y2="170" stroke="#006D5B" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          <Line x1="40" y1="166" x2="40" y2="174" stroke="#006D5B" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          
          {/* Scattered small dots */}
          <Circle cx="35" cy="55" r="3" fill="#006D5B" opacity="0.08" />
          <Circle cx="185" cy="140" r="4" fill="#006D5B" opacity="0.06" />
          <Circle cx="50" cy="120" r="2.5" fill="#006D5B" opacity="0.05" />
          <Circle cx="175" cy="180" r="3.5" fill="#006D5B" opacity="0.04" />
          <Circle cx="30" cy="90" r="2" fill="#006D5B" opacity="0.05" />
          <Circle cx="190" cy="90" r="2.5" fill="#006D5B" opacity="0.04" />
          
          {/* Small checkmark or decorative element */}
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

      <Text style={styles.noDataTitle}>No Trips Found</Text>
      <Text style={styles.noDataSubtitle}>
        {hasFilters 
          ? 'No trips match your current filters. Try adjusting your search criteria.'
          : 'Start by adding your first trip. Click the + button below to get started.'}
      </Text>

      {hasFilters ? (
        <TouchableOpacity style={styles.noDataButton} onPress={onClearFilters}>
          <MaterialIcons name="clear-all" size={20} color="#fff" />
          <Text style={styles.noDataButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.noDataButton} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.noDataButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ---- Reusable Card Component ----
const TripCard = ({ item, onPaymentRequest, onTransactions, onDocPlus, onEdit, canEdit }) => {
  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => console.log('Card pressed:', item.id)}
    >
      
      <View style={styles.cardHeader}>
        <Text style={styles.routeText} numberOfLines={1}>
          {item.route || item.source_place + ' → ' + item.destination_place}
        </Text>
        {canEdit && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => onEdit?.(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={14} color="#006D5B" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.rowWrap}>
        <Text style={styles.label}>
          Vehicle : <Text style={styles.value}>{item.vehicle_number || item.vehicleNo}</Text>
        </Text>
        <Text style={[styles.label, { marginLeft: 8 }]}>
          Trip : <Text style={styles.value}>{item.trip_id || item.tripId}</Text>
        </Text>
      </View>

      <View style={styles.rowWrap}>
        <Text style={styles.label}>
          Date : <Text style={styles.value}>{item.transport_date || item.dpDate}</Text>
        </Text>
        <Text style={[styles.label, { marginLeft: 8 }]}>
          Bill : <Text style={styles.value}>{item.bill_number || item.billNo}</Text>
        </Text>
      </View>

      <View style={styles.rowWrap}>
        <Text style={styles.totalText}>
          ₹ {item.total_amount || item.total || '0'}
        </Text>
        <Text style={[styles.dueText, { marginLeft: 12 }]}>
          Due: ₹ {item.due || item.due || '0'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.paymentBtn]}
          onPress={() => onPaymentRequest?.(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.transactionBtn]}
          onPress={() => onTransactions?.(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Transactions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.docBtn]}
          onPress={() => onDocPlus?.(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.docBtnText}>Doc</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ---- Main Screen ----
export default function TripPaymentCards({ navigation }) {
  const { userData } = useAuth();
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterBill, setFilterBill] = useState('');
  const [isFilterApplying, setIsFilterApplying] = useState(false);
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [pickerType, setPickerType] = useState('startDate');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Edit Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    client_id: '',
    source_place: '',
    destination_place: '',
    transport_date: '',
    vehicle_number: '',
    bill_number: '',
    material_weight: '',
    rate_per_ton: '',
    remarks: '',
  });

  // Full Screen Loading State
  const [fullScreenLoading, setFullScreenLoading] = useState(false);
  const [fullScreenMessage, setFullScreenMessage] = useState('Loading...');

  // Payment Modal States
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
  const [selectedTransportId, setSelectedTransportId] = useState(null);

  // Use refs to store latest values for immediate access
  const paymentAmountRef = useRef('');
  const paymentNoteRef = useRef('');

  // Debounce timer refs
  const debounceTimer = useRef(null);
  const editDebounceTimer = useRef(null);
  const filterDebounceTimer = useRef(null);
  const isMounted = useRef(true);
  const isFirstFocus = useRef(true);
  const isFetchingRef = useRef(false);
  const loadMoreTimeoutRef = useRef(null);
  const focusRefreshTimeoutRef = useRef(null);

  // Check if user is Admin
  const isAdmin = userData?.role === 'Admin' || userData?.role === 'admin';

  // Show Toast function
  const showToast = (type, text1, text2) => {
    Toast.show({
      type: type,
      text1: text1,
      text2: text2,
      position: 'bottom',
      visibilityTime: 2000,
      autoHide: true,
      bottomOffset: 50,
    });
  };

  // Update refs when states change
  useEffect(() => {
    paymentAmountRef.current = paymentAmount;
  }, [paymentAmount]);

  useEffect(() => {
    paymentNoteRef.current = paymentNote;
  }, [paymentNote]);

  // Check if any filters are active
  const hasActiveFilters = !!(filterStartDate || filterEndDate || filterVehicle || filterBill || searchText);

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Handle date selection
  const handleDateChange = (event, selected) => {
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    
    if (selected) {
      const dateStr = selected.toISOString().split('T')[0];
      if (pickerType === 'startDate') {
        setFilterStartDate(dateStr);
      } else if (pickerType === 'endDate') {
        setFilterEndDate(dateStr);
      }
    }
  };

  // Build params object from current filters
  const buildParams = (page = 1, perPage = 10) => {
    const params = {
      page: page,
      per_page: perPage
    };
    
    if (searchText) params.search = searchText;
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate) params.end_date = filterEndDate;
    if (filterVehicle) params.vehicle_number = filterVehicle;
    if (filterBill) params.bill_number = filterBill;
    
    return params;
  };

  // Fetch transports with pagination
  const fetchTransports = async (params = {}, isLoadMore = false) => {
    // Prevent concurrent fetch calls
    if (isFetchingRef.current) {
      console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log(`📥 Fetching transports: page ${params.page}, loadMore: ${isLoadMore}`);
      
      const response = await getTransports(params);
      
      let data = [];
      let pagination = {};
      
      if (response?.data && Array.isArray(response.data)) {
        data = response.data;
        pagination = response.pagination || response.meta || {};
      } else if (Array.isArray(response)) {
        data = response;
      } else if (response?.transports && Array.isArray(response.transports)) {
        data = response.transports;
        pagination = response.pagination || {};
      } else {
        data = [];
      }

      data = data.map(item => ({
        ...item,
        showPaymentTag: item.showPaymentTag !== undefined ? item.showPaymentTag : true,
      }));

      // Update pagination info from response
      const totalPagesFromResponse = pagination.total_pages || pagination.last_page || 1;
      const currentPageFromResponse = pagination.current_page || params.page || 1;
      const totalItemsFromResponse = pagination.total || pagination.total_count || data.length;
      
      setTotalPages(totalPagesFromResponse);
      setTotalItems(totalItemsFromResponse);
      setCurrentPage(currentPageFromResponse);
      
      // Determine if there are more pages
      const hasMorePages = currentPageFromResponse < totalPagesFromResponse;
      setHasMore(hasMorePages);

      console.log(`📊 Pagination: page ${currentPageFromResponse}/${totalPagesFromResponse}, hasMore: ${hasMorePages}, totalItems: ${totalItemsFromResponse}`);

      if (isLoadMore) {
        // Append new data, avoiding duplicates by ID
        setTransports(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = data.filter(item => !existingIds.has(item.id));
          console.log(`➕ Added ${newItems.length} new items, total now: ${prev.length + newItems.length}`);
          return [...prev, ...newItems];
        });
      } else {
        setTransports(data);
        console.log(`🔄 Set ${data.length} items from page ${currentPageFromResponse}`);
      }
      
      setIsFirstLoad(false);
    } catch (error) {
      console.error('❌ Fetch transports error:', error);
      showToast('error', 'Error', error.message || 'Failed to fetch transports');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      setIsFilterApplying(false);
    }
  };

  // Debounced fetch function
  const debouncedFetch = useCallback((params, isLoadMore = false) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchTransports(params, isLoadMore);
      debounceTimer.current = null;
    }, 500);
  }, []);

  // Load first page
  const loadFirstPage = (customParams = null) => {
    const params = customParams || buildParams(1, 10);
    params.page = 1;
    params.per_page = 10;
    
    setCurrentPage(1);
    setHasMore(true);
    setTotalPages(1);
    
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
      loadMoreTimeoutRef.current = null;
    }
    
    debouncedFetch(params, false);
  };

  // Auto-refresh when filters change (with debounce)
  useEffect(() => {
    if (filterDebounceTimer.current) {
      clearTimeout(filterDebounceTimer.current);
    }
    
    filterDebounceTimer.current = setTimeout(() => {
      console.log('🔍 Filters changed, refreshing...');
      const params = buildParams(1, 10);
      loadFirstPage(params);
      filterDebounceTimer.current = null;
    }, 600);
    
    return () => {
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
    };
  }, [filterStartDate, filterEndDate, filterVehicle, filterBill, searchText]);

  // Load next page
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || refreshing || loading || isFetchingRef.current) {
      return;
    }
    
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
      loadMoreTimeoutRef.current = null;
    }
    
    const nextPage = currentPage + 1;
    
    if (nextPage > totalPages) {
      setHasMore(false);
      return;
    }
    
    loadMoreTimeoutRef.current = setTimeout(() => {
      const params = buildParams(nextPage, 10);
      setCurrentPage(nextPage);
      fetchTransports(params, true);
      loadMoreTimeoutRef.current = null;
    }, 300);
  }, [loadingMore, hasMore, refreshing, loading, currentPage, totalPages]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    
    setHasMore(true);
    setCurrentPage(1);
    
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
      loadMoreTimeoutRef.current = null;
    }
    
    const params = buildParams(1, 10);
    fetchTransports(params, false);
  }, []);

  // Initial load
  useEffect(() => {
    console.log('🚀 Initial load');
    loadFirstPage();
    
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (editDebounceTimer.current) {
        clearTimeout(editDebounceTimer.current);
      }
      if (filterDebounceTimer.current) {
        clearTimeout(filterDebounceTimer.current);
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      if (focusRefreshTimeoutRef.current) {
        clearTimeout(focusRefreshTimeoutRef.current);
      }
      isFetchingRef.current = false;
    };
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      // Skip first focus as initial load already happened
      if (!isFirstFocus.current) {
        console.log('🔄 Focus refresh triggered');
        
        // Clear any pending focus refresh timeout
        if (focusRefreshTimeoutRef.current) {
          clearTimeout(focusRefreshTimeoutRef.current);
          focusRefreshTimeoutRef.current = null;
        }
        
        // Debounce the focus refresh to prevent multiple calls
        focusRefreshTimeoutRef.current = setTimeout(() => {
          // Only refresh if not already loading and not refreshing
          if (!loading && !refreshing && !isFetchingRef.current) {
            onRefresh();
          }
          focusRefreshTimeoutRef.current = null;
        }, 500);
      }
      isFirstFocus.current = false;
      
      return () => {
        // Cleanup timeout on unmount
        if (focusRefreshTimeoutRef.current) {
          clearTimeout(focusRefreshTimeoutRef.current);
          focusRefreshTimeoutRef.current = null;
        }
      };
    }, [])
  );

  // Debounced search
  const handleSearch = (text) => {
    setSearchText(text);
  };

  // Clear all filters
  const clearAllFilters = () => {
    console.log('🧹 Clearing all filters');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterVehicle('');
    setFilterBill('');
    setSearchText('');
    setShowFilterModal(false);
    
    const params = buildParams(1, 10);
    loadFirstPage(params);
  };

  // Apply filters
  const applyFilters = () => {
    console.log('🔍 Applying filters');
    setIsFilterApplying(true);
    
    setTimeout(() => {
      setShowFilterModal(false);
    }, 300);
    
    const params = buildParams(1, 10);
    loadFirstPage(params);
    Keyboard.dismiss();
  };

  // Clear filters (for modal)
  const clearFilters = () => {
    console.log('🧹 Clearing filters from modal');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterVehicle('');
    setFilterBill('');
    setSearchText('');
    setShowFilterModal(false);
    
    const params = buildParams(1, 10);
    loadFirstPage(params);
  };

  // ---- Edit Functions ----
  const handleEdit = (item) => {
    setFullScreenLoading(true);
    setFullScreenMessage('Loading transport details...');
    
    if (editDebounceTimer.current) {
      clearTimeout(editDebounceTimer.current);
    }
    
    editDebounceTimer.current = setTimeout(async () => {
      try {
        setEditingItem(item);
        
        const response = await getTransportById(item.id);
        const data = response?.data || response || {};
        
        setEditFormData({
          client_id: data.client_id || data.client_name || item.client_name || '',
          source_place: data.source_place || item.source_place || '',
          destination_place: data.destination_place || item.destination_place || '',
          transport_date: data.transport_date || item.transport_date || item.dpDate || '',
          vehicle_number: data.vehicle_number || item.vehicle_number || item.vehicleNo || '',
          bill_number: data.bill_number || item.bill_number || item.billNo || '',
          material_weight: data.material_weight ? String(data.material_weight) : '',
          rate_per_ton: data.rate_per_ton ? String(data.rate_per_ton) : '',
          remarks: data.remarks || '',
        });
        
        setFullScreenLoading(false);
        setEditModalVisible(true);
      } catch (error) {
        console.error('Error fetching transport details:', error);
        setFullScreenLoading(false);
        showToast('error', 'Error', 'Failed to load transport details');
      }
    }, 300);
  };

  const handleEditSubmit = async () => {
    if (!editFormData.source_place.trim()) {
      showToast('error', 'Error', 'Please enter source place');
      return;
    }
    if (!editFormData.destination_place.trim()) {
      showToast('error', 'Error', 'Please enter destination place');
      return;
    }
    if (!editFormData.vehicle_number.trim()) {
      showToast('error', 'Error', 'Please enter vehicle number');
      return;
    }

    setFullScreenLoading(true);
    setFullScreenMessage('Updating transport...');
    setEditLoading(true);

    try {
      const payload = {
        client_id: editFormData.client_id || '',
        source_place: editFormData.source_place,
        destination_place: editFormData.destination_place,
        transport_date: editFormData.transport_date || new Date().toLocaleDateString('en-GB'),
        vehicle_number: editFormData.vehicle_number,
        bill_number: editFormData.bill_number || '',
        material_weight: parseFloat(editFormData.material_weight) || 0,
        rate_per_ton: parseFloat(editFormData.rate_per_ton) || 0,
        remarks: editFormData.remarks || '',
      };

      const response = await updateTransport(editingItem.id, payload);
      
      setFullScreenLoading(false);
      
      if (response.status === true || response.success) {
        showToast('success', 'Success', 'Transport updated successfully');
        setEditModalVisible(false);
        setEditingItem(null);
        setEditFormData({
          client_id: '',
          source_place: '',
          destination_place: '',
          transport_date: '',
          vehicle_number: '',
          bill_number: '',
          material_weight: '',
          rate_per_ton: '',
          remarks: '',
        });
        const params = buildParams(1, 10);
        loadFirstPage(params);
      } else {
        showToast('error', 'Error', response?.message || 'Failed to update transport');
      }
    } catch (error) {
      console.error('Update transport error:', error);
      setFullScreenLoading(false);
      showToast('error', 'Error', error.message || 'Failed to update transport');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditFormData({ ...editFormData, [field]: value });
  };

  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setEditLoading(false);
    setEditFormData({
      client_id: '',
      source_place: '',
      destination_place: '',
      transport_date: '',
      vehicle_number: '',
      bill_number: '',
      material_weight: '',
      rate_per_ton: '',
      remarks: '',
    });
    if (editDebounceTimer.current) {
      clearTimeout(editDebounceTimer.current);
    }
  };

  // ========== PAYMENT HANDLERS ==========
  const handlePaymentRequest = (item) => {
    setSelectedTransportId(item.id);
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
      submitPaymentRequest('upi', { upi_id: data.upiId }, data.amount.toString(), data.note || '');
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
      upi_id: qrData.upi_id || ''
    });
  };

  const submitPaymentRequest = async (mode, data, directAmount = null, directNote = null) => {
    setLoadingSubmit(true);
    try {
      const amount = directAmount !== null ? directAmount : paymentAmountRef.current;
      const note = directNote !== null ? directNote : paymentNoteRef.current;

      const payload = {
        transport_id: selectedTransportId,
        payment_mode: mode === 'bank' ? 'Bank' : mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : 'QRCode',
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

      console.log('📤 Submitting Payment Payload:', JSON.stringify(payload, null, 2));

      const response = await submitTransaction(payload);
      console.log('📥 Submit Response:', JSON.stringify(response, null, 2));

      if (response.status === true || response.success === true) {
        showToast('success', 'Success', 'Payment request submitted successfully');
        setPaymentAmount('');
        setPaymentNote('');
        setSelectedPaymentMode(null);
        setSelectedBank(null);
        setUpiId('');
        setQrCodeString('');
        paymentAmountRef.current = '';
        paymentNoteRef.current = '';
        onRefresh();
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

  const handleTransactions = (item) => {
    navigation.navigate('Transactions', { transportId: item.id });
  };

  const handleDocPlus = (item) => {
    navigation.navigate('Documents', { transportId: item.id });
  };

  const handleAddNew = () => {
    navigation.navigate('TransportCreate');
  };

  // Render footer (loading more indicator)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#006D5B" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading && isFirstLoad) return null;
    return (
      <NoDataComponent 
        onRefresh={onRefresh}
        onClearFilters={clearAllFilters}
        hasFilters={hasActiveFilters}
      />
    );
  };

  // Render loading state with skeleton
  if (loading && isFirstLoad && transports.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.headerContainer}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search trips..."
                placeholderTextColor="#999"
                editable={false}
              />
            </View>
            <TouchableOpacity style={styles.filterButton}>
              <MaterialIcons name="filter-list" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.listContent}
          renderItem={() => <SkeletonCard />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Full Screen Loading Overlay */}
      {fullScreenLoading && (
        <View style={styles.fullScreenOverlay}>
          <View style={styles.fullScreenCard}>
            <ActivityIndicator size="large" color="#006D5B" />
            <Text style={styles.fullScreenText}>{fullScreenMessage}</Text>
          </View>
        </View>
      )}

      {/* Filter Applying Loading Overlay */}
      {isFilterApplying && (
        <View style={styles.fullScreenOverlay}>
          <View style={styles.fullScreenCard}>
            <ActivityIndicator size="large" color="#006D5B" />
            <Text style={styles.fullScreenText}>Applying filters...</Text>
          </View>
        </View>
      )}

      {/* Search Bar in Header */}
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trips..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={handleSearch}
              returnKeyType="search"
              onSubmitEditing={() => {
                const params = buildParams(1, 10);
                loadFirstPage(params);
                Keyboard.dismiss();
              }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchText('');
                  const params = buildParams(1, 10);
                  loadFirstPage(params);
                }}
              >
                <MaterialIcons name="close" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <MaterialIcons name="filter-list" size={22} color="#fff" />
            {hasActiveFilters && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsContainer}>
              {filterStartDate && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>From: {formatDateDisplay(filterStartDate)}</Text>
                  <TouchableOpacity onPress={() => setFilterStartDate('')}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              {filterEndDate && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>To: {formatDateDisplay(filterEndDate)}</Text>
                  <TouchableOpacity onPress={() => setFilterEndDate('')}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              {filterVehicle && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Vehicle: {filterVehicle}</Text>
                  <TouchableOpacity onPress={() => setFilterVehicle('')}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              {filterBill && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Bill: {filterBill}</Text>
                  <TouchableOpacity onPress={() => setFilterBill('')}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={clearAllFilters} style={styles.clearChip}>
                <MaterialIcons name="close" size={14} color="#fff" />
                <Text style={styles.clearChipText}>Clear All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Transport List with Pagination */}
      <FlatList
        data={transports}
        keyExtractor={(item, index) => String(item.id) + '-' + index}
        contentContainerStyle={[
          styles.listContent,
          transports.length === 0 && styles.emptyList
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TripCard
            item={item}
            onPaymentRequest={handlePaymentRequest}
            onTransactions={handleTransactions}
            onDocPlus={handleDocPlus}
            onEdit={handleEdit}
            canEdit={isAdmin}
          />
        )}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#006D5B']}
            tintColor="#006D5B"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        scrollEventThrottle={16}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleAddNew}
      >
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal && !isFilterApplying}
        onRequestClose={() => {
          if (!isFilterApplying) {
            setShowFilterModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity 
                onPress={() => {
                  if (!isFilterApplying) {
                    setShowFilterModal(false);
                  }
                }}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Start Date - Line 1 */}
              <View style={styles.filterRow}>
                <View style={[styles.filterGroup, styles.filterGroupFull]}>
                  <Text style={styles.filterLabel}>Start Date</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => {
                      setPickerType('startDate');
                      setShowStartDatePicker(true);
                    }}
                  >
                    <MaterialIcons name="calendar-today" size={20} color="#666" />
                    <Text style={filterStartDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                      {filterStartDate ? formatDateDisplay(filterStartDate) : 'Select start date'}
                    </Text>
                    {filterStartDate && (
                      <TouchableOpacity 
                        onPress={() => setFilterStartDate('')}
                        style={styles.clearDateBtn}
                      >
                        <MaterialIcons name="close" size={16} color="#999" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Date - Line 2 */}
              <View style={styles.filterRow}>
                <View style={[styles.filterGroup, styles.filterGroupFull]}>
                  <Text style={styles.filterLabel}>End Date</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => {
                      setPickerType('endDate');
                      setShowEndDatePicker(true);
                    }}
                  >
                    <MaterialIcons name="calendar-today" size={20} color="#666" />
                    <Text style={filterEndDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                      {filterEndDate ? formatDateDisplay(filterEndDate) : 'Select end date'}
                    </Text>
                    {filterEndDate && (
                      <TouchableOpacity 
                        onPress={() => setFilterEndDate('')}
                        style={styles.clearDateBtn}
                      >
                        <MaterialIcons name="close" size={16} color="#999" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Vehicle Filter */}
              <View style={styles.filterRow}>
                <View style={[styles.filterGroup, styles.filterGroupFull]}>
                  <Text style={styles.filterLabel}>Vehicle No.</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Enter vehicle no"
                    placeholderTextColor="#999"
                    value={filterVehicle}
                    onChangeText={setFilterVehicle}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Bill Filter */}
              <View style={styles.filterRow}>
                <View style={[styles.filterGroup, styles.filterGroupFull]}>
                  <Text style={styles.filterLabel}>Bill Number</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Enter bill number"
                    placeholderTextColor="#999"
                    value={filterBill}
                    onChangeText={setFilterBill}
                  />
                </View>
              </View>

              {/* Buttons Row */}
              <View style={styles.modalButtonRow}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.clearButton]}
                  onPress={clearFilters}
                  disabled={isFilterApplying}
                >
                  <MaterialIcons name="clear-all" size={18} color="#666" />
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.applyButton]}
                  onPress={applyFilters}
                  disabled={isFilterApplying}
                >
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modals */}
      {showStartDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editModalContainer}
          >
            <View style={styles.editModalHeader}>
              <View style={styles.editModalHeaderLeft}>
                <MaterialIcons name="edit" size={24} color="#006D5B" />
                <Text style={styles.editModalTitle}>Edit Transport</Text>
              </View>
              <TouchableOpacity 
                onPress={handleCloseEditModal}
                style={styles.editModalClose}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.editModalContent}
            >
              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Source Place <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter source place"
                  placeholderTextColor="#999"
                  value={editFormData.source_place}
                  onChangeText={(text) => handleEditChange('source_place', text)}
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Destination Place <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter destination place"
                  placeholderTextColor="#999"
                  value={editFormData.destination_place}
                  onChangeText={(text) => handleEditChange('destination_place', text)}
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Vehicle Number <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter vehicle number"
                  placeholderTextColor="#999"
                  value={editFormData.vehicle_number}
                  onChangeText={(text) => handleEditChange('vehicle_number', text)}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.editRow}>
                <View style={[styles.editFormGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.editLabel}>Transport Date</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#999"
                    value={editFormData.transport_date}
                    onChangeText={(text) => handleEditChange('transport_date', text)}
                  />
                </View>

                <View style={[styles.editFormGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.editLabel}>Bill Number</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="Enter bill no"
                    placeholderTextColor="#999"
                    value={editFormData.bill_number}
                    onChangeText={(text) => handleEditChange('bill_number', text)}
                  />
                </View>
              </View>

              <View style={styles.editRow}>
                <View style={[styles.editFormGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.editLabel}>Weight (Ton)</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="Enter weight"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={editFormData.material_weight}
                    onChangeText={(text) => handleEditChange('material_weight', text)}
                  />
                </View>

                <View style={[styles.editFormGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.editLabel}>Rate per Ton</Text>
                  <TextInput
                    style={styles.editInput}
                    placeholder="Enter rate"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={editFormData.rate_per_ton}
                    onChangeText={(text) => handleEditChange('rate_per_ton', text)}
                  />
                </View>
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Remarks</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  placeholder="Enter remarks (optional)"
                  placeholderTextColor="#999"
                  value={editFormData.remarks}
                  onChangeText={(text) => handleEditChange('remarks', text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.editModalButtonRow}>
                <TouchableOpacity 
                  style={[styles.editModalButton, styles.editCancelButton]}
                  onPress={handleCloseEditModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editModalButton, styles.editUpdateButton]}
                  onPress={handleEditSubmit}
                  disabled={editLoading}
                  activeOpacity={0.8}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.editUpdateButtonText}>Update</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Payment Modals */}
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
            onRefresh();
          }
        }}
        onSelectBank={handleBankSelect}
        amount={paymentAmount}
        note={paymentNote}
        transportId={selectedTransportId}
        onAddBank={handleAddBank}
        loading={loadingSubmit}
        paymentMode="bank"
      />

      <QRCodeModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        onSaveQR={handleQRCodeSave}
        amount={paymentAmount}
        transportId={selectedTransportId}
        loading={loadingSubmit}
      />
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  fullScreenCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  fullScreenText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  headerContainer: {
    backgroundColor: '#006D5B',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 0,
    height: 40,
  },
  filterButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: '#006D5B',
  },
  activeFiltersRow: {
    marginTop: 8,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    gap: 4,
  },
  filterChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 2,
  },
  clearChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 80,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0e8e8',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  editButtonText: {
    fontSize: 10,
    color: '#006D5B',
    fontWeight: '600',
  },
  routeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    maxWidth: '70%',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontWeight: '400',
    color: '#333',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2e7d32',
    marginTop: 2,
  },
  dueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e53935',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBtn: {
    backgroundColor: '#006D5B',
  },
  transactionBtn: {
    backgroundColor: '#1976D2',
  },
  docBtn: {
    backgroundColor: '#f5b800',
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  docBtnText: {
    color: '#1a1a1a',
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#006D5B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  filterGroup: {
    flex: 1,
    marginHorizontal: 0,
  },
  filterGroupFull: {
    flex: 1,
    marginHorizontal: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 10,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f8f8f8',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  datePickerPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#999',
  },
  clearDateBtn: {
    padding: 2,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 6,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#006D5B',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  editModalClose: {
    padding: 4,
  },
  editModalContent: {
    paddingBottom: 10,
  },
  editFormGroup: {
    marginBottom: 14,
  },
  editRow: {
    flexDirection: 'row',
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#e53935',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f8f8f8',
  },
  editTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editModalButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editCancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editUpdateButton: {
    backgroundColor: '#006D5B',
  },
  editCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  editUpdateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});

export default TripPaymentCards;