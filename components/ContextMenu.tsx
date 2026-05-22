import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo } from 'react';

type MenuIconName = Parameters<typeof IconSymbol>[0]['name'];
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type ContextMenuItem = {
  key: string;
  label: string;
  icon?: MenuIconName;
  destructive?: boolean;
  divider?: boolean;
};

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onAction: (key: string) => void;
  onClose: () => void;
}

const MENU_WIDTH = 184;
const ITEM_HEIGHT = 44;
const SCREEN_MARGIN = 8;

export default function ContextMenu({
  visible,
  x,
  y,
  items,
  onAction,
  onClose,
}: ContextMenuProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const position = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const rowCount = items.filter((item) => !item.divider).length;
    const dividerCount = items.filter((item) => item.divider).length;
    const menuHeight = rowCount * ITEM_HEIGHT + dividerCount * 9 + 12;

    let left = x;
    let top = y;

    if (left + MENU_WIDTH > width - SCREEN_MARGIN) {
      left = width - MENU_WIDTH - SCREEN_MARGIN;
    }
    if (left < SCREEN_MARGIN) {
      left = SCREEN_MARGIN;
    }
    if (top + menuHeight > height - SCREEN_MARGIN) {
      top = y - menuHeight;
    }
    if (top < SCREEN_MARGIN + 40) {
      top = SCREEN_MARGIN + 40;
    }

    return { left, top, menuHeight };
  }, [items, x, y]);

  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.menu,
          {
            left: position.left,
            top: position.top,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {items.map((item, index) =>
          item.divider ? (
            <View
              key={`divider-${index}`}
              style={[styles.divider, { backgroundColor: theme.border }]}
            />
          ) : (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.background },
              ]}
              onPress={() => onAction(item.key)}
            >
              {item.icon ? (
                <IconSymbol
                  name={item.icon}
                  size={17}
                  color={item.destructive ? '#FF6B6B' : theme.tint}
                />
              ) : (
                <View style={styles.iconPlaceholder} />
              )}
              <Text
                style={[
                  styles.menuText,
                  {
                    color: item.destructive ? '#FF6B6B' : theme.text,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
  },
  iconPlaceholder: {
    width: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginHorizontal: 12,
  },
});
