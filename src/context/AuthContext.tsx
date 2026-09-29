import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  id: number;
  name: string;
  role: string;
  device_token: string;
  email: string;
  mobile: string;
  mobile_verified_at: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userData: UserData | null;
  login: (token: string, phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: UserData) => Promise<void>;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  // API Base URL
  const API_BASE_URL = 'https://inextwebs.com/megatron_new/api/v1';

  // Get auth headers
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await AsyncStorage.getItem('Token');
    return {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Validate token with API
  const validateToken = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('Token');
      
      if (!token) {
        console.log('❌ No token found');
        return false;
      }

      console.log('🔍 Validating token with API...');
      
      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: await getAuthHeaders()
      });

      const responseData = await response.json();
      console.log('📡 API Response:', responseData);

      if (response.ok && responseData.status === true && responseData.data) {
        // Update user data from API response
        const userInfo: UserData = responseData.data;
        await AsyncStorage.setItem('userData', JSON.stringify(userInfo));
        setUserData(userInfo);
        console.log('✅ Token validated successfully. User:', userInfo.name);
        return true;
      } else {
        // Token is invalid or expired
        console.log('❌ Token validation failed:', responseData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return false;
    }
  };

  const login = async (token: string, phoneNumber: string) => {
    try {
      console.log('🔑 Login function called with token:', token);
      
      // First save the token
      await AsyncStorage.setItem('Token', token);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userPhone', phoneNumber);
      
      // Fetch and validate user data from API
      const isValid = await validateToken();
      
      if (!isValid) {
        // If token is invalid, clean up and throw error
        await AsyncStorage.multiRemove(['Token', 'isLoggedIn', 'userPhone', 'userData']);
        throw new Error('Invalid token');
      }
      
      setIsAuthenticated(true);
      console.log('✅ Login successful, isAuthenticated set to true');
    } catch (error) {
      console.error('❌ Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Call logout API
      try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: await getAuthHeaders()
        });

        const responseData = await response.json();
        console.log('📡 Logout Response:', responseData);
        
        if (response.ok) {
          console.log('✅ Logout API call successful');
        } else {
          console.log('⚠️ Logout API call failed:', responseData);
        }
      } catch (apiError) {
        // Don't fail the logout if API call fails
        console.warn('⚠️ Logout API error, continuing with local logout:', apiError);
      }
      
      // Clear local storage regardless of API response
      await AsyncStorage.multiRemove(['Token', 'isLoggedIn', 'userPhone', 'userData']);
      setIsAuthenticated(false);
      setUserData(null);
      console.log('🚪 Logout successful');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Still clear local storage even if there's an error
      await AsyncStorage.multiRemove(['Token', 'isLoggedIn', 'userPhone', 'userData']);
      setIsAuthenticated(false);
      setUserData(null);
      throw error;
    }
  };

  const updateUserData = async (data: UserData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      setUserData(data);
      console.log('📝 User data updated');
    } catch (error) {
      console.error('❌ Error updating user data:', error);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('Token');
      const isLoggedInValue = await AsyncStorage.getItem('isLoggedIn');
      const userDataString = await AsyncStorage.getItem('userData');
      
      console.log('🔍 Checking login status...');
      console.log('📌 Token exists:', !!token);
      console.log('📌 isLoggedIn:', isLoggedInValue);
      
      let isAuth = false;
      
      // If token exists and isLoggedIn is true, validate with API
      if (token && isLoggedInValue === 'true') {
        const isValid = await validateToken();
        isAuth = isValid;
        
        if (!isValid) {
          // If token is invalid, clear storage
          console.log('⚠️ Token invalid, clearing storage...');
          await AsyncStorage.multiRemove(['Token', 'isLoggedIn', 'userPhone', 'userData']);
          setUserData(null);
        } else if (userDataString) {
          // If we have user data in storage, use it
          try {
            const parsedData = JSON.parse(userDataString);
            setUserData(parsedData);
          } catch (parseError) {
            console.error('Error parsing user data:', parseError);
          }
        }
      } else {
        console.log('ℹ️ No valid login found');
      }
      
      setIsAuthenticated(isAuth);
      console.log('✅ Auth status checked. isAuthenticated:', isAuth);
    } catch (error) {
      console.error('❌ Error checking login status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading, 
      userData, 
      login, 
      logout,
      updateUserData,
      validateToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};