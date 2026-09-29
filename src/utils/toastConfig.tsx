import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

export const toastConfig = {
  error: (props) => (
    <LinearGradient
      colors={['#ff6b6b', '#ff4444', '#cc0000']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.toastContainer}
    >
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>!</Text>
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        <Text style={styles.message}>{props.text2}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>
    </LinearGradient>
  ),
  
  success: (props) => (
    <LinearGradient
      colors={['#6bff6b', '#4caf50', '#2e7d32']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.toastContainer}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, styles.successIcon]}>
          <Text style={styles.iconText}>✓</Text>
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        <Text style={styles.message}>{props.text2}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, styles.successProgress]} />
      </View>
    </LinearGradient>
  ),
  
  info: (props) => (
    <LinearGradient
      colors={['#6bc9ff', '#2196f3', '#0b5e9e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.toastContainer}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, styles.infoIcon]}>
          <Text style={styles.iconText}>ℹ</Text>
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        <Text style={styles.message}>{props.text2}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, styles.infoProgress]} />
      </View>
    </LinearGradient>
  ),
  
  warning: (props) => (
    <LinearGradient
      colors={['#ffb86b', '#ff9800', '#e65100']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.toastContainer}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, styles.warningIcon]}>
          <Text style={styles.iconText}>⚠</Text>
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        <Text style={styles.message}>{props.text2}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, styles.warningProgress]} />
      </View>
    </LinearGradient>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 20,
    width: width - 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  iconContainer: {
    marginRight: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  successIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  infoIcon: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
  },
  warningIcon: {
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
  },
  iconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.95,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1.5,
  },
  successProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  infoProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  warningProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});