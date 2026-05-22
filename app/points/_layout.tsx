import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';

export default function PointsLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: '积分玩法' }} />
      <Stack.Screen name="stock" options={{ title: '摸鱼股市' }} />
      <Stack.Screen name="tournament" options={{ title: '武道大会' }} />
      <Stack.Screen name="tower" options={{ title: '无尽爬塔' }} />
    </Stack>
  );
}
