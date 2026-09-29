// navigation/DrawerNavigation.js
import { TouchableOpacity, View } from 'react-native';
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MaterialIcons from '@react-native-vector-icons/material-icons';

// Screens import
import AllTransactions from '../screens/drawer/AllTransactions';
import ApproveTransaction from '../screens/drawer/ApproveTransaction';
import SuccessTransaction from '../screens/drawer/SuccessTransaction';
import PendingTransaction from '../screens/drawer/PendingTransaction';
import SuccessIssue from '../screens/drawer/SuccessIssue';
import ClientPayments from '../screens/drawer/ClientPayments';
import FuelManagement from '../screens/drawer/FuelManagement';
import TabNavigation from './TabNavigation';
import Transactions from '../screens/tab/Transactions';
import TransportG from '../screens/tab/CreateTransport'; //
import Documents from '../screens/tab/Documents';
import CustomDrawerNavigation from './CustomDrawerNavigation';
import colors from '../constants/colors';

const Drawer = createDrawerNavigator();

const HeaderLeft = ({ navigation }: { navigation: any }) => { 
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('TabNavigation')}
      style={{ marginLeft: 30 }}
    >
      <MaterialIcons name="arrow-back" size={30} color="white" />
    </TouchableOpacity>
  );
};

const DrawerNavigation = ({ onLogout }: { onLogout?: () => void }) => {
  return (
    <Drawer.Navigator
      screenOptions={({ navigation }) => ({
        headerLeft: () => <HeaderLeft navigation={navigation} />,
        headerTitleStyle: {
          color: colors.white,
        },     
        backBehavior: 'initialRoute',
        headerStyle: {
          backgroundColor: "#006D5B"
        } 
      })}
      drawerContent={(props) => <CustomDrawerNavigation {...props} onLogout={onLogout} />}
    >
      {/* TabNavigation - Hidden from drawer */}
      <Drawer.Screen
        name="TabNavigation"
        component={TabNavigation}
        options={{
          headerShown: false,
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* ✅ TransportG - Drawer mein add kiya, lekin hidden */}
      <Drawer.Screen
        name="TransportCreate"
        component={TransportG}
        options={{
          headerShown: true, // Custom header dikhayenge
          drawerItemStyle: { display: 'none' }, // ✅ Drawer mein hide
        }}
      />
      <Drawer.Screen
        name="Documents"
        component={Documents}
        options={{
          headerShown: true, // Custom header dikhayenge
          drawerItemStyle: { display: 'none' }, // ✅ Drawer mein hide
        }}
      />

      {/* Other Drawer Screens */}
      <Drawer.Screen
        name="AllTransactions"
        component={AllTransactions}
        options={{
          title: 'All Transactions',
          headerTitleStyle: {
            color: "#fff" 
          },
          drawerIcon: ({ color, size }) => {
            return <MaterialIcons name="list" color={color} size={size} />;
          },
        }}
      />
      <Drawer.Screen
        name="ApproveTransaction"
        component={ApproveTransaction}
        options={{
          title: 'Approve Transaction',
          drawerIcon: ({ color, size }) => {
            return <MaterialIcons name="verified" color={color} size={size} />;
          },
        }}
      />
      <Drawer.Screen
        name="SuccessTransaction"
        component={SuccessTransaction}
        options={{
          title: 'Success Transaction',
          drawerIcon: ({ color, size }) => {
            return <MaterialIcons name="done-all" color={color} size={size} />;
          },
        }}
      />
      <Drawer.Screen
        name="PendingTransaction"
        component={PendingTransaction}
        options={{
          title: 'Pending Transaction',
          drawerIcon: ({ color, size }) => {
            return (
              <MaterialIcons name="pending-actions" color={color} size={size} />
            );
          },
        }}
      />
      <Drawer.Screen
        name="SuccessIssue"
        component={SuccessIssue}
        options={{
          title: 'Success Issue',
          drawerIcon: ({ color, size }) => {
            return <MaterialIcons name="error" color={color} size={size} />;
          },
        }}
      />
      <Drawer.Screen
        name="ClientPayments"
        component={ClientPayments}
        options={{
          title: ' Client Payments',
          drawerIcon: ({ color, size }) => {
            return (
              <MaterialIcons name="currency-rupee" color={color} size={size} />
            );
          },
        }}
      />
      <Drawer.Screen
        name="FuelManagement"
        component={FuelManagement}
        options={{
          title: 'Fuel Management',
          drawerIcon: ({ color, size }) => {
            return (
              <MaterialIcons
                name="local-gas-station"
                color={color}
                size={size}
              />
            );
          },
        }}
      />
      <Drawer.Screen
        name="Transactions"
        component={Transactions}
        options={{
          title: 'Transactions',
          drawerIcon: ({ color, size }) => {
            return (
              <MaterialIcons
                name="local-gas-station"
                color={color}
                size={size}
              />
            );
          },
        }}
      />
    </Drawer.Navigator>
  );
};

export default DrawerNavigation;