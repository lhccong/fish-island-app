import { tournamentApi } from '@/api/tournament';
import OtherUserPetModal from '@/components/pet/OtherUserPetModal';
import PetImage from '@/components/PetImage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type RankItem = {
  rank: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  petName?: string;
  petAvatar?: string;
  score?: number;
};

export default function TournamentPanel() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<RankItem[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [petModalVisible, setPetModalVisible] = useState(false);
  const [petTarget, setPetTarget] = useState<{ userId: number; userName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lbRes, rankRes] = await Promise.all([
        tournamentApi.getLeaderboard(),
        tournamentApi.getMyRank(),
      ]);
      if (lbRes?.code === 0) setLeaderboard(lbRes.data || []);
      if (rankRes?.code === 0) setMyRank(rankRes.data ?? null);
    } catch {
      toast.error('加载排行榜失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success('刷新成功');
  };

  const handleChallenge = (rank: number) => {
    const target = leaderboard.find((x) => x.rank === rank);
    const q = new URLSearchParams({ from: 'tournament', targetRank: String(rank) });
    if (target?.userId) q.set('opponentUserId', String(target.userId));
    router.push(`/pet/fight?${q.toString()}`);
  };

  const topThree = [1, 2, 3].map((r) => leaderboard.find((x) => x.rank === r));
  const restRanks: number[] = [];
  const maxRank = Math.max(10, ...leaderboard.map((x) => x.rank), 3);
  for (let i = 4; i <= maxRank; i++) restRanks.push(i);

  const podiumOrder = [topThree[1], topThree[0], topThree[2]];

  return (
    <View style={[styles.wrap, { backgroundColor: '#fff7e6' }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fa8c16" />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.titleIcon}>👑</Text>
          <Text style={styles.pageTitle}>武道大会</Text>
          <Text style={styles.pageSub}>挑战强者，登顶巅峰</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 12 }}>我的排名</Text>
            <Text style={[styles.statVal, { color: '#1890ff' }]}>{myRank ?? '未上榜'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 12 }}>参赛人数</Text>
            <Text style={styles.statVal}>{leaderboard.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 12 }}>可挑战</Text>
            <Text style={[styles.statVal, { color: '#fa8c16' }]}>无限</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#fa8c16" style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={styles.podiumRow}>
              {podiumOrder.map((item, idx) => {
                const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
                return (
                  <View
                    key={rank}
                    style={[
                      styles.podiumItem,
                      { backgroundColor: item ? '#fff' : 'rgba(255,255,255,0.5)' },
                      rank === 1 && styles.podiumFirst,
                    ]}
                  >
                    <Text style={{ fontSize: rank === 1 ? 28 : 22 }}>{rank === 1 ? '👑' : `#${rank}`}</Text>
                    {item ? (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setPetTarget({ userId: item.userId, userName: item.userName || '用户' });
                            setPetModalVisible(true);
                          }}
                        >
                          {item.petAvatar ? (
                            <PetImage url={item.petAvatar} size={48} />
                          ) : item.userAvatar ? (
                            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                          ) : (
                            <Text style={{ fontSize: 32 }}>🐾</Text>
                          )}
                        </TouchableOpacity>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {item.userName}
                        </Text>
                        <Text style={{ color: colors[rank - 1], fontWeight: '700' }}>⭐ {item.score ?? 0}</Text>
                        <TouchableOpacity
                          style={[styles.challengeBtn, myRank === rank && styles.challengeDisabled]}
                          disabled={myRank === rank}
                          onPress={() => handleChallenge(rank)}
                        >
                          <Text style={styles.challengeBtnText}>挑战</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={{ fontSize: 36, marginVertical: 8 }}>❓</Text>
                        <Text style={{ color: theme.icon, fontSize: 12 }}>虚位以待</Text>
                        <TouchableOpacity style={styles.challengeBtn} onPress={() => handleChallenge(rank)}>
                          <Text style={styles.challengeBtnText}>挑战</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={[styles.listCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.listTitle, { color: theme.text }]}>🏆 排名榜（第4名起）</Text>
              {restRanks.map((rank) => {
                const item = leaderboard.find((x) => x.rank === rank);
                return (
                  <View key={rank} style={[styles.listRow, { borderColor: theme.border }]}>
                    <Text style={[styles.rankNo, { color: '#fa8c16' }]}>{rank}</Text>
                    {item ? (
                      <>
                        <TouchableOpacity
                          style={styles.listMeta}
                          onPress={() => {
                            setPetTarget({ userId: item.userId, userName: item.userName || '用户' });
                            setPetModalVisible(true);
                          }}
                        >
                          <Text style={{ color: theme.text, fontWeight: '600' }}>{item.userName}</Text>
                          <Text style={{ color: theme.icon, fontSize: 12 }}>
                            {item.petName} · ⭐{item.score ?? 0}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.challengeBtnSmall, myRank === rank && styles.challengeDisabled]}
                          disabled={myRank === rank}
                          onPress={() => handleChallenge(rank)}
                        >
                          <Text style={styles.challengeBtnText}>挑战</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.listMeta, { color: theme.icon }]}>虚位以待</Text>
                        <TouchableOpacity style={styles.challengeBtnSmall} onPress={() => handleChallenge(rank)}>
                          <Text style={styles.challengeBtnText}>挑战</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <OtherUserPetModal
        visible={petModalVisible}
        target={petTarget}
        onClose={() => {
          setPetModalVisible(false);
          setPetTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 28 },
  pageHeader: { alignItems: 'center', marginBottom: 16 },
  titleIcon: { fontSize: 32 },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fa8c16',
    marginTop: 4,
  },
  pageSub: { color: '#8c8c8c', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '700', marginTop: 4, color: '#262626' },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 16 },
  podiumItem: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'flex-end',
    gap: 6,
  },
  podiumFirst: { minHeight: 210, marginBottom: 0 },
  playerName: { fontSize: 12, fontWeight: '600', maxWidth: 90, textAlign: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  challengeBtn: {
    backgroundColor: '#fa8c16',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  challengeBtnSmall: {
    backgroundColor: '#fa8c16',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  challengeDisabled: { opacity: 0.45 },
  challengeBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  listCard: { borderRadius: 14, padding: 14 },
  listTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rankNo: { width: 28, fontWeight: '800', textAlign: 'center' },
  listMeta: { flex: 1 },
});
