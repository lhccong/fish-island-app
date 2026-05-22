import PetSprite from '@/components/PetSprite';
import {
  DEFAULT_SPRITE_ACTIONS,
  getPetDisplayHeight,
  isWebpSprite,
  SPRITE_FRAME_HEIGHT,
  SPRITE_FRAME_WIDTH,
  SPRITE_TOTAL_COLS,
  SPRITE_TOTAL_ROWS,
} from '@/utils/petRender';
import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface PetImageProps {
  url?: string | null;
  /** 展示宽度（与 web 端 size 一致，精灵图按 192 基准缩放） */
  size: number;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

/**
 * 宠物图片：webp 精灵图用 PetSprite 动画，其他格式用静态图
 */
export default function PetImage({
  url,
  size,
  autoPlay = true,
  style,
  imageStyle,
  borderRadius = 14,
}: PetImageProps) {
  if (!url) {
    return null;
  }

  if (isWebpSprite(url)) {
    const scale = size / SPRITE_FRAME_WIDTH;
    const height = getPetDisplayHeight(size);
    return (
      <View style={[styles.spriteWrap, { width: size, height }, style]}>
        <PetSprite
          spriteUrl={url}
          frameWidth={SPRITE_FRAME_WIDTH}
          frameHeight={SPRITE_FRAME_HEIGHT}
          totalCols={SPRITE_TOTAL_COLS}
          totalRows={SPRITE_TOTAL_ROWS}
          actions={DEFAULT_SPRITE_ACTIONS}
          scale={scale}
          autoPlay={autoPlay}
          autoPlayMinInterval={3000}
          autoPlayMaxInterval={8000}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={[
        {
          width: size,
          height: size,
          borderRadius,
        },
        imageStyle,
        style,
      ]}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  spriteWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
