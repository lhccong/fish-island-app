import {
  DEFAULT_SPRITE_ACTIONS,
  PetAction,
  pickRandomActionIndex,
  SPRITE_FRAME_HEIGHT,
  SPRITE_FRAME_WIDTH,
  SPRITE_TOTAL_COLS,
  SPRITE_TOTAL_ROWS,
} from '@/utils/petRender';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export interface PetSpriteProps {
  spriteUrl: string;
  frameWidth?: number;
  frameHeight?: number;
  totalCols?: number;
  totalRows?: number;
  actions?: PetAction[];
  defaultActionIndex?: number;
  scale?: number;
  style?: StyleProp<ViewStyle>;
  autoPlay?: boolean;
  autoPlayMinInterval?: number;
  autoPlayMaxInterval?: number;
  startWithIdle?: boolean;
  onPress?: (actionIndex: number, action: PetAction) => void;
}

export default function PetSprite({
  spriteUrl,
  frameWidth = SPRITE_FRAME_WIDTH,
  frameHeight = SPRITE_FRAME_HEIGHT,
  totalCols = SPRITE_TOTAL_COLS,
  totalRows = SPRITE_TOTAL_ROWS,
  actions = DEFAULT_SPRITE_ACTIONS,
  defaultActionIndex = 0,
  scale = 1,
  style,
  autoPlay = false,
  autoPlayMinInterval = 3000,
  autoPlayMaxInterval = 8000,
  startWithIdle = true,
  onPress,
}: PetSpriteProps) {
  const [actionIndex, setActionIndex] = useState(() =>
    startWithIdle && actions.length > 0
      ? 0
      : Math.min(defaultActionIndex, Math.max(actions.length - 1, 0)),
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const lastClickRef = useRef(0);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAction = actions[actionIndex] ?? actions[0];

  const scaledW = frameWidth * scale;
  const scaledH = frameHeight * scale;
  const bgWidth = frameWidth * totalCols * scale;

  const computedTotalRows = useMemo(
    () => totalRows ?? Math.max(...actions.map((a) => a.row)) + 1,
    [actions, totalRows],
  );

  const bgHeightResolved = frameHeight * computedTotalRows * scale;

  useEffect(() => {
    setFrameIndex(0);
  }, [actionIndex, currentAction.frames, currentAction.row]);

  useEffect(() => {
    if (!currentAction?.frames) return undefined;
    const frameMs = Math.max(16, Math.floor(currentAction.duration / currentAction.frames));
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % currentAction.frames);
    }, frameMs);
    return () => clearInterval(timer);
  }, [currentAction.duration, currentAction.frames, currentAction.row]);

  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  const scheduleNextAction = useCallback(() => {
    clearAutoPlayTimer();
    if (!autoPlay || actions.length <= 1) return;

    const interval =
      autoPlayMinInterval + Math.random() * (autoPlayMaxInterval - autoPlayMinInterval);

    autoPlayTimerRef.current = setTimeout(() => {
      setActionIndex((prev) => pickRandomActionIndex(actions, prev));
      scheduleNextAction();
    }, interval);
  }, [
    actions,
    autoPlay,
    autoPlayMaxInterval,
    autoPlayMinInterval,
    clearAutoPlayTimer,
  ]);

  useEffect(() => {
    scheduleNextAction();
    return clearAutoPlayTimer;
  }, [scheduleNextAction, clearAutoPlayTimer]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 100) return;
    lastClickRef.current = now;

    clearAutoPlayTimer();
    setActionIndex((prev) => {
      const next = (prev + 1) % actions.length;
      onPress?.(next, actions[next]);
      return next;
    });
    scheduleNextAction();
  }, [actions, clearAutoPlayTimer, onPress, scheduleNextAction]);

  const offsetX = -frameIndex * scaledW;
  const offsetY = -currentAction.row * scaledH;

  return (
    <Pressable onPress={handlePress} style={[styles.pressable, style]}>
      <View style={[styles.clip, { width: scaledW, height: scaledH }]}>
        <Image
          source={{ uri: spriteUrl }}
          style={{
            width: bgWidth,
            height: bgHeightResolved,
            position: 'absolute',
            left: offsetX,
            top: offsetY,
          }}
          contentFit="fill"
          cachePolicy="memory-disk"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  clip: {
    overflow: 'hidden',
  },
});
