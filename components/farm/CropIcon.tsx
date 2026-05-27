import type { CropDTO } from '@/api/farm';
import { isCropIconUrl } from '@/utils/farmUtils';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';

interface CropIconProps {
  crop?: CropDTO | null;
  size?: number;
  style?: ViewStyle;
}

export default function CropIcon({ crop, size = 28, style }: CropIconProps) {
  const icon = crop?.icon?.trim();
  if (!icon) {
    return <Text style={[styles.emoji, { fontSize: size * 0.85 }, style]}>🌱</Text>;
  }
  if (isCropIconUrl(icon)) {
    return (
      <Image
        source={{ uri: icon.startsWith('/') ? `https://api.yucoder.cn${icon}` : icon }}
        style={[{ width: size, height: size }, style]}
        contentFit="contain"
      />
    );
  }
  return <Text style={[styles.emoji, { fontSize: size * 0.85 }, style]}>{icon}</Text>;
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
});
