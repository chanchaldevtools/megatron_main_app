// navigation/HomeStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../screens/tab/Home';
import TransportG from '../screens/tab/CreateTransport';
import Documents from '../screens/tab/Documents';

const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen" component={Home} />
      <Stack.Screen 
        name="TransportCreate" 
        component={TransportG} 
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#006D5B' },
          headerTintColor: 'white',
          headerTitle: 'Transport Create',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="Documents" 
        component={Documents} 
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#006D5B' },
          headerTintColor: 'white',
          headerTitle: 'Documents',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;