import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import img from '../assets/img/imageSource';

// SIRF MaterialIcons ka import
import MaterialIcons from '@react-native-vector-icons/material-icons';
import LinearGradient from 'react-native-linear-gradient';
import { getTransactionCounts } from '../Api/api'; // Import API function

const { width, height } = Dimensions.get('window');

const CustomDrawerNavigation = ({ navigation }: any) => {
  const [userData, setUserData] = useState({
    name: '',
    phone: '',
    role: 'User',
    email: '',
  });

  const [deviceDetails, setDeviceDetails] = useState({
    deviceName: '',
    model: '',
    brand: '',
  });

  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeScreen, setActiveScreen] = useState('');
  const [counts, setCounts] = useState({
    allTransactions: 0,
    approveTransaction: 0,
    successTransaction: 0,
    pendingTransaction: 0,
    successIssue: 0,
    clientPayments: 0,
  });

  useEffect(() => {
    loadUserData();
    getDeviceInfo();
    fetchCounts();
  }, []);

  // Fetch counts from API
  const fetchCounts = async () => {
    try {
      const response = await getTransactionCounts();
      console.log('countResponse', response);
      
      if (response && response.success) {
        const data = response.data || {};
        
        // Safely get values with fallback to 0
        const total = data.total || 0;
        const pending = data.pending || 0;
        const approved = data.approved || 0;
        const paid = data.paid || 0;
        const issue = data.issue || 0;
        
        // Calculate issue if not provided directly
        // Total - (pending + approved + paid + issue) = remaining
        // Or use issue directly if available
        const calculatedIssue = issue > 0 ? issue : (total - (pending + approved + paid));
        
        setCounts({
          allTransactions: total,
          approveTransaction: approved,
          successTransaction: paid,
          pendingTransaction: pending,
          successIssue: calculatedIssue > 0 ? calculatedIssue : 0,
          clientPayments: data.clientPayments || 0,
        });
        
        console.log('Counts set:', {
          total,
          pending,
          approved,
          paid,
          issue: calculatedIssue
        });
      } else {
        // If API returns success: false or no data, set all to 0
        console.log('API returned success: false or no data');
        setCounts({
          allTransactions: 0,
          approveTransaction: 0,
          successTransaction: 0,
          pendingTransaction: 0,
          successIssue: 0,
          clientPayments: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
      // Set all counts to 0 on error
      setCounts({
        allTransactions: 0,
        approveTransaction: 0,
        successTransaction: 0,
        pendingTransaction: 0,
        successIssue: 0,
        clientPayments: 0,
      });
    }
  };

  const getDeviceInfo = async () => {
    try {
      const name = await DeviceInfo.getDeviceName();
      const model = DeviceInfo.getModel();
      const brand = DeviceInfo.getBrand();
      setDeviceDetails({
        deviceName: name || 'Mobile Device',
        model: model || 'Unknown Model',
        brand: brand || 'Unknown Brand',
      });
    } catch (error) {
      console.error('Error fetching device info:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const phoneNumber = await AsyncStorage.getItem('userPhone');
      const userDataString = await AsyncStorage.getItem('userData');

      if (userDataString) {
        const parsedData = JSON.parse(userDataString);
        setUserData({
          name: parsedData.name || phoneNumber || 'User',
          phone: phoneNumber || 'Not available',
          role: parsedData.role || 'User',
          email: parsedData.email || '',
        });
      } else if (phoneNumber) {
        setUserData({
          name: phoneNumber,
          phone: phoneNumber,
          role: 'User',
          email: '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setShowLogoutModal(false);
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Menu items with specific icon colors for each
  const menuItems = [
    {
      id: 'AllTransactions',
      label: 'All Transactions',
      icon: 'receipt-long',
      iconColor: '#546E7A',
      countKey: 'allTransactions',
      countColor: '#FF6B6B',
      countBg: '#FFE8E8',
    },
    {
      id: 'ApproveTransaction',
      label: 'Approve Transaction',
      icon: 'verified',
      iconColor: '#2196F3',
      countKey: 'approveTransaction',
      countColor: '#2196F3',
      countBg: '#E3F2FD',
    },
    {
      id: 'SuccessTransaction',
      label: 'Success Transactions',
      icon: 'check-circle',
      iconColor: '#4CAF50',
      countKey: 'successTransaction',
      countColor: '#4CAF50',
      countBg: '#E8F5E9',
    },
    {
      id: 'PendingTransaction',
      label: 'Pending Transaction',
      icon: 'schedule',
      iconColor: '#FFA726',
      countKey: 'pendingTransaction',
      countColor: '#FFA726',
      countBg: '#FFF3E0',
    },
    {
      id: 'SuccessIssue',
      label: 'Success Issue',
      icon: 'report-problem',
      iconColor: '#EF5350',
      countKey: 'successIssue',
      countColor: '#EF5350',
      countBg: '#FFEBEE',
    },
   
  ];

  const renderIcon = (item: any) => {
    const size = 22;
    const isActive = activeScreen === item.id;
    const color = isActive ? '#006D5B' : item.iconColor;

    return <MaterialIcons name={item.icon} size={size} color={color} />;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#006D5B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#006D5B" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Premium Header with Gradient */}
        <LinearGradient
          colors={['#006D5B', '#00897B', '#00A88C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.profileContainer}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                <Image source={img.logo} style={styles.avatar} resizeMode="cover" />
                <View style={styles.onlineBadge} />
              </View>
              <View style={styles.userInfoSection}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userData.name}
                </Text>
                <Text style={styles.userPhone}>{userData.phone}</Text>
                <View style={styles.roleContainer}>
                  <View style={styles.roleBadge}>
                    <MaterialIcons name="verified" size={12} color="#fff" />
                    <Text style={styles.roleText}>{userData.role}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Device Info */}
        <View style={styles.deviceInfoContainer}>
          <View style={styles.deviceIconBox}>
            <MaterialIcons name="smartphone" size={18} color="#006D5B" />
          </View>
          <View style={styles.deviceInfoText}>
            <Text style={styles.deviceLabel}>Active Device</Text>
            <Text style={styles.deviceName} numberOfLines={1}>
              {deviceDetails.brand} • {deviceDetails.deviceName}
            </Text>
          </View>
          <View style={styles.deviceStatus}>
            <View style={styles.deviceDot} />
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>MAIN MENU</Text>
            <View style={styles.menuLine} />
          </View>

          {menuItems.map((item) => {
            const isActive = activeScreen === item.id;
            const count = counts[item.countKey as keyof typeof counts] || 0;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemBox,
                  isActive && styles.activeMenuItemBox,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setActiveScreen(item.id);
                  navigation.navigate(item.id);
                }}
              >
                <View style={[
                  styles.iconContainer, 
                  isActive && styles.activeIconContainer,
                  isActive && { borderColor: item.iconColor }
                ]}>
                  {renderIcon(item)}
                </View>
                <Text style={[styles.menuLabel, isActive && styles.activeMenuLabel]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countContainer, { backgroundColor: item.countBg }]}>
                    <Text style={[styles.countText, { color: item.countColor }]}>
                      {count}
                    </Text>
                  </View>
                )}
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF5252', '#D32F2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconWrapper}>
              <LinearGradient
                colors={['#FF5252', '#D32F2F']}
                style={styles.modalIconGradient}
              >
                <MaterialIcons name="power-settings-new" size={30} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to logout? You'll need to login again to access your account.
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomDrawerNavigation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  profileContainer: {
    width: '100%',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoSection: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  userPhone: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  roleContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  deviceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfoText: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  deviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#37474F',
    marginTop: 1,
  },
  deviceStatus: {
    marginLeft: 8,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9E9E9E',
    letterSpacing: 1.2,
  },
  menuLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8ECF0',
    marginLeft: 12,
  },
  menuItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
    position: 'relative',
  },
  activeMenuItemBox: {
    backgroundColor: '#E8F5E9',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#006D5B',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
    marginLeft: 14,
    flex: 1,
    letterSpacing: 0.2,
  },
  activeMenuLabel: {
    color: '#006D5B',
    fontWeight: '700',
  },
  countContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 20,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    backgroundColor: '#F8FAFB',
  },
  logoutButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconWrapper: {
    marginBottom: 16,
  },
  modalIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalCancelText: {
    color: '#616161',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  modalLogoutButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modalLogoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});