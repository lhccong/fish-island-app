import { POINTS_GAMES } from '@/constants/pointsPlay';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PointsHubScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo } = useUser();
  const availablePoints = (userInfo?.points ?? 0) - (userInfo?.usedPoints ?? 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.heroIcon}>💎</Text>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>积分玩法</Text>
            <Text style={[styles.heroSub, { color: theme.icon }]}>
              使用摸鱼币参与小游戏，赢取更多积分
            </Text>
          </View>
          <View style={[styles.pointsBadge, { backgroundColor: theme.tint + '18' }]}>
            <Text style={[styles.pointsVal, { color: theme.tint }]}>{availablePoints}</Text>
            <Text style={[styles.pointsLabel, { color: theme.icon }]}>可用积分</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>选择玩法</Text>

        {POINTS_GAMES.map((game) => (
          <TouchableOpacity
            key={game.key}
            style={[
              styles.gameCard,
              { backgroundColor: game.bg, borderColor: game.accent + '44' },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push(game.path as any)}
          >
            <View style={[styles.gameIconWrap, { backgroundColor: '#fff' }]}>
              <Text style={styles.gameIcon}>{game.icon}</Text>
            </View>
            <View style={styles.gameInfo}>
              <Text style={[styles.gameTitle, { color: game.accent }]}>{game.title}</Text>
              <Text style={[styles.gameSub, { color: theme.icon }]}>{game.subtitle}</Text>
            </View>
            <Text style={[styles.enterArrow, { color: game.accent }]}>进入 ›</Text>
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 28 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  heroIcon: { fontSize: 36 },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: '700' },
  heroSub: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  pointsBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pointsVal: { fontSize: 18, fontWeight: '800' },
  pointsLabel: { fontSize: 10, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
    gap: 12,
  },
  gameIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  gameIcon: { fontSize: 28 },
  gameInfo: { flex: 1, minWidth: 0 },
  gameTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  gameSub: { fontSize: 12, lineHeight: 17 },
  enterArrow: { fontSize: 15, fontWeight: '700' },
  tipBox: { borderRadius: 10, padding: 14, marginTop: 8 },
  tipText: { fontSize: 12, lineHeight: 18 },
});
