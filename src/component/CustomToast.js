// components/CustomToast.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';

const CustomToast = ({ visible, message, type = 'error', onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#4caf50', icon: 'check-circle' };
      case 'error':
        return { bg: '#d32f2f', icon: 'error-outline' };
      default:
        return { bg: '#4caf50', icon: 'check-circle' };
    }
  };

  const colors = getColors();

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
      <View style={[styles.toastContent, { backgroundColor: colors.bg }]}>
        <MaterialIcons name={colors.icon} size={24} color="#fff" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});

export default CustomToast;