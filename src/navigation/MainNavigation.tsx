import { StyleSheet } from 'react-native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../screens/Login';
import DrawerNavigation from './DrawerNavigation';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

const MainNavigation = () => {
  const Stack = createNativeStackNavigator();
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#367588" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!isLoggedIn ? (
        <Stack.Screen name="Login" component={Login} />
      ) : (
        <Stack.Screen name="DrawerNavigation" component={DrawerNavigation} />
      )}
    </Stack.Navigator>
  );
};

export default MainNavigation;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});