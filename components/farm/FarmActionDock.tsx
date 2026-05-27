import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const STORAGE_KEY = 'fish-island-farm-dock-expanded';

/** 收起/展开共用高度，避免撑开布局导致农田抖动 */
export const FARM_DOCK_SLOT_HEIGHT = 96;

export type FarmDockActionKey = 'shop' | 'task' | 'bag' | 'reward' | 'cottage';

type DockItem = {
  key: FarmDockActionKey;
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
};

const DOCK_ITEMS: DockItem[] = [
  { key: 'shop', label: '商店', icon: 'bag.fill' },
  { key: 'task', label: '任务', icon: 'checklist' },
  { key: 'bag', label: '背包', icon: 'briefcase.fill' },
  { key: 'reward', label: '领取奖励', icon: 'gift.fill' },
  { key: 'cottage', label: '农舍', icon: 'house.fill' },
];

export type FarmActionDockProps = {
  matureCount: number;
  matureLabel: string;
  disabled?: boolean;
  onMature: () => void;
  onAction: (key: FarmDockActionKey) => void;
};

export default function FarmActionDock({
  matureCount,
  matureLabel,
  disabled,
  onMature,
  onAction,
}: FarmActionDockProps) {
  const [expanded, setExpanded] = useState(false);

  const persistExpanded = useCallback(async (value: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const openPanel = useCallback(() => {
    setExpanded(true);
    persistExpanded(true);
  }, [persistExpanded]);

  const closePanel = useCallback(() => {
    setExpanded(false);
    persistExpanded(false);
  }, [persistExpanded]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored === '1') setExpanded(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.wrap}>
      {!expanded ? (
        <TouchableOpacity
          style={styles.fab}
          disabled={disabled}
          accessibilityLabel="展开操作栏"
          onPress={openPanel}
          activeOpacity={0.85}
        >
          <IconSymbol name="square.grid.2x2" size={22} color="#52a934" />
        </TouchableOpacity>
      ) : (
      <View style={styles.panel}>
        <TouchableOpacity
          style={styles.closeBtn}
          disabled={disabled}
          accessibilityLabel="收起操作栏"
          onPress={closePanel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="xmark" size={14} color="#8c8c8c" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={[styles.item, matureCount > 0 && styles.itemActive]}
            disabled={disabled}
            onPress={onMature}
            activeOpacity={0.85}
          >
            <View style={styles.iconCircle}>
              <IconSymbol name="clock.fill" size={18} color="#d48806" />
            </View>
            <Text style={styles.itemLabel}>成熟</Text>
            <Text style={styles.itemSub} numberOfLines={1}>
              {matureLabel}
            </Text>
          </TouchableOpacity>

          {DOCK_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.item}
              disabled={disabled}
              onPress={() => onAction(item.key)}
              activeOpacity={0.85}
            >
              <View style={styles.iconCircle}>
                <IconSymbol name={item.icon} size={18} color="#d48806" />
              </View>
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: FARM_DOCK_SLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(149, 222, 100, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#283c1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  panel: {
    width: '100%',
    height: FARM_DOCK_SLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(149, 222, 100, 0.65)',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    overflow: 'hidden',
    shadowColor: '#283c1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  closeBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: 'rgba(250, 250, 250, 0.95)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    maxWidth: 80,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: 'rgba(255, 247, 230, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#ffe8b3',
    marginBottom: 4,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5d4037',
    textAlign: 'center',
  },
  itemSub: {
    marginTop: 2,
    fontSize: 10,
    color: '#8b6914',
    textAlign: 'center',
    maxWidth: 72,
  },
});
