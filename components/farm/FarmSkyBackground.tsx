import { FARM_SKY_GRADIENT, FARM_SKY_GRADIENT_LOCATIONS } from '@/constants/farmTheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

/**
 * 与 frontend .farm-page 一致的天空→草地渐变
 * background: linear-gradient(180deg, #b8e0f5 0%, #d4edba 45%, #9ccc65 100%);
 */
export default function FarmSkyBackground({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={[...FARM_SKY_GRADIENT]}
      locations={[...FARM_SKY_GRADIENT_LOCATIONS]}
      style={[styles.root, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
