import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

// Responsive width
export const wp = (size: number): number => {
  return (SCREEN_WIDTH / guidelineBaseWidth) * size;
};

// Responsive height
export const hp = (size: number): number => {
  return (SCREEN_HEIGHT / guidelineBaseHeight) * size;
};

// Responsive font size
export const rf = (size: number): number => {
  const scale = SCREEN_WIDTH / guidelineBaseWidth;
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};

// Check if device is tablet
export const isTablet = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  return (adjustedWidth >= 600 && adjustedHeight >= 600) || 
         (SCREEN_WIDTH >= 600 && SCREEN_HEIGHT >= 600);
};

// Get device type
export const getDeviceType = (): 'tablet' | 'phone' | 'small-phone' => {
  if (SCREEN_WIDTH >= 768) return 'tablet';
  if (SCREEN_HEIGHT >= 800) return 'phone';
  return 'small-phone';
};

export default {
  wp,
  hp,
  rf,
  isTablet,
  getDeviceType,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};