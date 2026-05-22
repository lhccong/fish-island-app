import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useEventRemind } from '@/contexts/EventRemindContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_BAR_BASE_HEIGHT = Platform.select({ ios: 49, default: 56 }) ?? 56;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { unreadCount } = useEventRemind();
  const tabBarBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const messageBadge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingBottom: tabBarBottomInset,
          height: TAB_BAR_BASE_HEIGHT + tabBarBottomInset,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '摸鱼室',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.right.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          title: '鱼小圈',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '我的',
          tabBarBadge: messageBadge,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
