import { Image, StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import img from '../assets/img/imageSource'
import { OtpInput } from 'react-native-otp-entry'
import Toast from 'react-native-toast-message';
import { sendOTP, VerifyOTP } from '../Api/api';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext';

const Login = ({ navigation }) => {
  const [requestOtp, setRequestOtp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

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

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const limited = cleaned.slice(0, 10);
    setPhoneNumber(limited);
  };
  
  const requestOTP = async () => {
    if (phoneNumber.length !== 10) {
      showToast('error', 'Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      const response = await sendOTP(phoneNumber);
      console.log('Send OTP Response:', response);

      if (response.status === true) {
        showToast('success', 'OTP Sent', response.messsage || 'OTP sent successfully');
        setRequestOtp(true);
      } else {
        showToast('error', 'Failed', response.messsage || 'This number has no access');
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      showToast('error', 'Network Error', 'Please check your internet connection');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user info based on phone number (static data)
  const getUserInfoByPhone = (phone) => {
    const users = {
      '9004567894562': {
        name: 'Chanchal Gosh',
        role: 'Admin',
        email: 'chanchal@megatron.com',
      },
      '9876543210': {
        name: 'Rajesh Kumar',
        role: 'Manager',
        email: 'rajesh@megatron.com',
      },
      '9988776655': {
        name: 'Priya Singh',
        role: 'User',
        email: 'priya@megatron.com',
      },
    };

    const defaultUser = {
      name: phone,
      role: 'User',
      email: '',
    };

    return users[phone] || defaultUser;
  };

  // Verify OTP and Login function
  const handleLogin = async () => {
    if (otp.length !== 4) {
      showToast('error', 'Invalid OTP', 'Please enter a valid 4-digit OTP');
      return;
    }
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      const response = await VerifyOTP(phoneNumber, otp);
      console.log('Verify OTP Response:', response);

      if (response.status === true) {
        showToast('success', 'Login Success', response.message || 'OTP validated successfully');
        
        // Get static user info based on phone number
        const staticUserInfo = getUserInfoByPhone(phoneNumber);
        
        // ✅ FIX: Create userInfo object that matches the API response structure
        // This should match what your AuthContext expects when validateToken is called
        const userInfo = {
          id: 1, // You might get this from API
          name: staticUserInfo.name,
          role: staticUserInfo.role,
          device_token: "0",
          email: staticUserInfo.email,
          mobile: phoneNumber,
          mobile_verified_at: new Date().toISOString(),
          email_verified_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // ✅ FIX: Store user data using AuthContext's login with proper structure
        // The AuthContext login function will:
        // 1. Save token
        // 2. Validate token with API
        // 3. Save user data from API response
        // Since we want to use our static user data, we'll save it separately
        await AsyncStorage.setItem('userData', JSON.stringify(userInfo));
        
        // ✅ FIX: Call login with only token and phoneNumber
        // AuthContext's login will validate token and fetch user data from API
        if (response.data?.access_token) {
          console.log('Calling login function with token');
          await login(response.data.access_token, phoneNumber);
          console.log('Login function completed successfully');
        } else {
          // If no token from API, use static token for testing
          const staticToken = 'test_token_' + Date.now();
          await login(staticToken, phoneNumber);
        }
        
        // ✅ The navigation will happen automatically when isAuthenticated becomes true
        // No need to manually navigate!
        
      } else {
        showToast('error', 'Login Failed', response.message || 'Invalid OTP. Please try again');
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      showToast('error', 'Network Error', 'Please check your internet connection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.card}>
              <Image 
                style={styles.logo} 
                source={img.logo} 
                resizeMode='contain'
              />
              <View style={styles.textContainer}>
                <Text style={styles.title}>Megatron CRM</Text>
                <Text style={styles.subtitle}>
                  {requestOtp 
                    ? "Enter the 4-digit OTP sent to your mobile number" 
                    : "We will send you a One Time Password to this mobile number"}
                </Text>
              </View>
              
              <View style={styles.inputContainer}>
                {requestOtp ? (
                  <>
                    <View style={styles.otpWrapper}>
                      <OtpInput 
                        numberOfDigits={4} 
                        type='numeric'  
                        onTextChange={setOtp} 
                        autoFocus={true} 
                        focusColor={"#367588"}
                        focusStyle={styles.otpFocus}
                        theme={{
                          pinCodeContainerStyle: styles.otpInput,
                          pinCodeTextStyle: styles.otpText,
                        }}
                      />
                    </View>
                    
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      onPress={handleLogin}
                      disabled={isLoading}
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Login</Text>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => {
                        setRequestOtp(false);
                        setOtp('');
                        setPhoneNumber('');
                      }}
                      style={styles.backButton}
                    >
                      <Text style={styles.backButtonText}>← Change Phone Number</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.phoneInputContainer}>
                      <View style={styles.countryCodeContainer}>
                        <Text style={styles.countryCode}>+91</Text>
                      </View>
                      <TextInput 
                        placeholder="Enter 10-digit mobile number" 
                        placeholderTextColor="#999"
                        style={styles.input} 
                        keyboardType='number-pad' 
                        value={phoneNumber}
                        onChangeText={handlePhoneChange}
                        maxLength={10}
                        editable={!isLoading}
                      />
                    </View>
                    
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      onPress={requestOTP}
                      disabled={isLoading || phoneNumber.length !== 10}
                      style={[styles.button, (isLoading || phoneNumber.length !== 10) && styles.buttonDisabled]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Request OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
                          
              <Text style={styles.footerText}>
                By logging in, you agree to our Terms & Conditions
              </Text>
              
              <Text style={styles.versionText}>
                Version 1.0.0.0
              </Text>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

export default Login

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    padding: 25,
    alignItems: 'center', 
  },
  logo: {
    height: 120,
    width: 120,
    marginBottom: 20,
  },
  textContainer: {
    width: '100%',
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    color: '#367588',
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  countryCodeContainer: {
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    paddingHorizontal: 15,
    height: 55,
    justifyContent: 'center',
  },
  countryCode: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#367588',
  },
  input: {
    flex: 1,
    height: 55,
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  otpWrapper: {
    marginBottom: 20,
    alignItems: 'center',
  },
  otpInput: {
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    width: 55,
    height: 55,
  },
  otpText: {
    color: '#222',
    fontSize: 20,
    fontWeight: 'bold',
  },
  otpFocus: {
    borderColor: '#367588',
  },
  button: {
    backgroundColor: '#367588',
    width: '100%',
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#367588',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: 'white',
  },
  backButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#367588',
    fontSize: 14,
    fontWeight: '500',
  },
  footerText: {
    marginTop: 20,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  versionText: {
    marginTop: 10,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  }
});