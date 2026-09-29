// navigation/TabNavigation.js
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import Home from '../screens/tab/Home';
import Record from '../screens/tab/Record';
import Fuel from '../screens/tab/Fuel';
import { DrawerActions, useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

const HomeIcon = ({ color, size }) => <MaterialIcons name="home" color={color} size={size} />;
const RecordIcon = ({ color, size }) => <MaterialIcons name="history" color={color} size={size} />;
const FuelIcon = ({ color, size }) => <MaterialIcons name="local-gas-station" color={color} size={size} />;

const TabNavigation = () => {
    const navigation = useNavigation();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#006D5B',
                tabBarInactiveTintColor: 'gray',
                headerStyle: {
                    backgroundColor: '#006D5B',
                    height: 90,
                },
                headerTitleStyle: {
                    color: 'white',
                    fontWeight: '500',
                },
                headerLeft: () => (
                    <TouchableOpacity 
                        style={{ marginLeft: 20 }}
                        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    >
                        <MaterialIcons name="menu" color="white" size={30} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Tab.Screen 
                name="Home" 
                component={Home} 
                options={{ title: 'Transports', tabBarIcon: HomeIcon }} 
            />
            <Tab.Screen 
                name="Record" 
                component={Record} 
                options={{ title: 'Record', tabBarIcon: RecordIcon }} 
            />
            
        </Tab.Navigator>
    );
};

export default TabNavigation;