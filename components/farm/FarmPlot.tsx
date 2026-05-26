import type { CropDTO, LandDTO } from '@/api/farm';
import CropIcon from '@/components/farm/CropIcon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FARM_LAND } from '@/constants/farmTheme';
import { formatCountdownCompact } from '@/utils/farmLayout';
import { isLandMature, isLandUnlocked, LAND_STATUS } from '@/utils/farmUtils';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

export interface FarmPlotProps {
  land: LandDTO | null;
  arrayIndex: number;
  unlockedCount: number;
  now: number;
  crop?: CropDTO;
  tileSize: number;
  disabled?: boolean;
  /** 拜访好友农场：可偷地块显示「偷菜」 */
  friendMode?: boolean;
  onPress: () => void;
}

function getRemainingMs(land: LandDTO, now: number): number {
  if (!land.harvestTime) return 0;
  return new Date(land.harvestTime).getTime() - now;
}

export default function FarmPlot({
  land,
  arrayIndex,
  unlockedCount,
  now,
  crop,
  tileSize,
  disabled,
  friendMode = false,
  onPress,
}: FarmPlotProps) {
  const unlocked = isLandUnlocked(land);
  const mature = unlocked && land != null && isLandMature(land, now);
  const canSteal = friendMode && mature && land?.canSteal === true;
  const growing =
    unlocked && land?.status === LAND_STATUS.GROWING && land != null && !mature;
  const isNextUnlock = !unlocked && arrayIndex === unlockedCount;

  const floatAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0.35)).current;
  const hintAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!mature) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -5, duration: 1000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
    );
    const hintLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    floatLoop.start();
    sparkleLoop.start();
    hintLoop.start();
    return () => {
      floatLoop.stop();
      sparkleLoop.stop();
      hintLoop.stop();
    };
  }, [mature, floatAnim, sparkleAnim, hintAnim]);

  const slotH = tileSize * 1.05;
  const iconSize = Math.round(tileSize * 0.4);
  const labelFont = Math.max(9, Math.round(tileSize * 0.19));
  const lockIconSize = Math.max(14, Math.round(tileSize * 0.26));

  const tileFilter: ViewStyle | undefined = !unlocked
    ? { opacity: 0.88 }
    : isNextUnlock
      ? { opacity: 1.05 }
      : undefined;

  const surfaceStyle: ViewStyle[] = [styles.tileSurface];
  const moundStyle: ViewStyle[] = [styles.mound];

  if (!unlocked) {
    surfaceStyle.push(styles.surfaceLocked);
    moundStyle.push(styles.moundLocked);
  }
  if (growing) moundStyle.push(styles.moundGrowing);
  if (mature) {
    surfaceStyle.push(styles.surfaceMature);
    moundStyle.push(styles.moundMature);
  }
  if (canSteal) {
    surfaceStyle.push(styles.surfaceStealable);
  }

  return (
    <View style={[styles.slot, { width: tileSize, height: slotH }]}>
      <Pressable
        style={({ pressed }) => [
          styles.plot,
          pressed && unlocked && !disabled && styles.plotPressed,
        ]}
        disabled={!unlocked || disabled}
        onPress={onPress}
      >
        <View style={[styles.soil, tileFilter]}>
          <View style={surfaceStyle} />
          <View style={moundStyle} />
        </View>

        {!unlocked ? (
          <View style={styles.overlayLocked}>
            <IconSymbol name="lock.fill" size={lockIconSize} color="#fff" />
            <Text style={[styles.lockText, { fontSize: labelFont }]} numberOfLines={1}>
              未解锁
            </Text>
          </View>
        ) : mature ? (
          <View style={styles.overlay}>
            {canSteal ? (
              <>
                <CropIcon crop={crop} size={iconSize} />
                <Text style={styles.stealHint}>偷菜</Text>
              </>
            ) : (
              <>
                <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                  <CropIcon crop={crop} size={iconSize} />
                </Animated.View>
                <Animated.View
                  style={[styles.sparkle, { opacity: sparkleAnim }]}
                  pointerEvents="none"
                />
                <Animated.Text
                  style={[styles.harvestHint, { transform: [{ scale: hintAnim }] }]}
                >
                  收获
                </Animated.Text>
              </>
            )}
          </View>
        ) : growing && land ? (
          <View style={styles.overlay}>
            <CropIcon crop={crop} size={Math.round(iconSize * 0.9)} />
            <Text
              style={[styles.timer, { fontSize: labelFont, maxWidth: tileSize * 0.95 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {formatCountdownCompact(getRemainingMs(land, now), tileSize)}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'relative',
  },
  plot: {
    width: '100%',
    height: '100%',
  },
  plotPressed: {
    transform: [{ translateY: -4 }],
  },
  soil: {
    ...StyleSheet.absoluteFillObject,
  },
  tileSurface: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: '6%',
    bottom: '22%',
    borderRadius: 14,
    backgroundColor: FARM_LAND.color,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.35)',
    shadowColor: FARM_LAND.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 4,
  },
  surfaceLocked: {
    backgroundColor: '#b89878',
  },
  surfaceMature: {
    shadowColor: '#ffc107',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  surfaceStealable: {
    shadowColor: '#ff5722',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  mound: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    bottom: '6%',
    height: '22%',
    borderRadius: 20,
    backgroundColor: FARM_LAND.color,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.28)',
  },
  moundLocked: {
    backgroundColor: '#b89878',
  },
  moundGrowing: {
    backgroundColor: '#b5c48a',
  },
  moundMature: {
    backgroundColor: '#c9a06e',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  overlayLocked: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 3,
    top: '8%',
  },
  lockText: {
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(90, 60, 40, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  timer: {
    marginTop: 2,
    fontWeight: '700',
    color: '#5d4037',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    textAlign: 'center',
  },
  harvestHint: {
    position: 'absolute',
    bottom: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  stealHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#ff5722',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 235, 59, 0.45)',
  },
});
