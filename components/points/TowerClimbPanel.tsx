import { towerApi } from '@/api/tower';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function getFloorTheme(floor: number) {
  if (floor <= 10) return { color: '#52c41a', label: '新手区', bg: '#f6ffed' };
  if (floor <= 30) return { color: '#1890ff', label: '进阶区', bg: '#e6f7ff' };
  if (floor <= 60) return { color: '#722ed1', label: '精英区', bg: '#f9f0ff' };
  if (floor <= 99) return { color: '#fa8c16', label: '传说区', bg: '#fff7e6' };
  return { color: '#ff4d4f', label: '神话区', bg: '#fff1f0' };
}

export default function TowerClimbPanel() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo } = useUser();
  const availablePoints = (userInfo?.points ?? 0) - (userInfo?.usedPoints ?? 0);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFloor, setPreviewFloor] = useState(1);
  const [previewMonster, setPreviewMonster] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, rankRes] = await Promise.all([
        towerApi.getProgress(),
        towerApi.getRanking(20),
      ]);
      if (progRes?.code === 0) setProgress(progRes.data ?? null);
      if (rankRes?.code === 0) setRanking(rankRes.data ?? []);
    } catch {
      toast.error('加载爬塔数据失败');
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
  };

  const currentFloor = progress?.maxFloor ?? 0;
  const nextFloor = progress?.nextFloor ?? 1;
  const nextMonster = progress?.nextMonster;
  const floorTheme = getFloorTheme(nextFloor);
  const myRank = ranking.find((r) => String(r.userId) === String(userInfo?.id));

  const handleChallenge = () => {
    router.push(`/pet/fight?from=tower&floor=${nextFloor}`);
  };

  const openPreview = async (floor: number) => {
    setPreviewFloor(floor);
    setPreviewVisible(true);
    setPreviewLoading(true);
    setPreviewMonster(null);
    try {
      const res = await towerApi.getFloorMonster(floor);
      if (res?.code === 0) setPreviewMonster(res.data ?? null);
    } catch {
      toast.error('加载怪物信息失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const towerFloors = Array.from({ length: Math.min(10, nextFloor + 2) }, (_, i) => nextFloor + 2 - i);

  return (
    <View style={[styles.wrap, { backgroundColor: '#f0f2f5' }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#722ed1" />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.titleIcon}>🗼</Text>
          <Text style={styles.pageTitle}>无尽爬塔</Text>
          <Text style={styles.pageSub}>带领宠物挑战无尽高塔，登顶排行榜！</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statBlue, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 11 }}>最高层</Text>
            <Text style={styles.statVal}>{currentFloor} 层</Text>
          </View>
          <View style={[styles.statCard, styles.statPurple, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 11 }}>下一层</Text>
            <Text style={styles.statVal}>{nextFloor} 层</Text>
          </View>
          <View style={[styles.statCard, styles.statOrange, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 11 }}>我的排名</Text>
            <Text style={styles.statVal}>{myRank ? `#${myRank.rank}` : '未上榜'}</Text>
          </View>
          <View style={[styles.statCard, styles.statGreen, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.icon, fontSize: 11 }}>可用积分</Text>
            <Text style={[styles.statVal, { color: theme.tint }]}>{availablePoints}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#722ed1" style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={[styles.challengeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.floorBanner, { backgroundColor: floorTheme.bg }]}>
                <Text style={{ color: theme.icon }}>第</Text>
                <Text style={[styles.floorNum, { color: floorTheme.color }]}>{nextFloor}</Text>
                <Text style={{ color: theme.icon }}>层</Text>
                <View style={[styles.zoneTag, { borderColor: floorTheme.color }]}>
                  <Text style={{ color: floorTheme.color, fontSize: 11 }}>{floorTheme.label}</Text>
                </View>
              </View>

              {nextMonster ? (
                <View style={styles.monsterSection}>
                  <View style={styles.monsterRow}>
                    {nextMonster.avatarUrl ? (
                      <Image source={{ uri: nextMonster.avatarUrl }} style={styles.monsterAvatar} />
                    ) : (
                      <Text style={{ fontSize: 48 }}>👹</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.monsterName, { color: floorTheme.color }]}>
                        {nextMonster.name ?? `第${nextFloor}层守卫`}
                      </Text>
                      <Text style={{ color: theme.icon, fontSize: 12, marginTop: 4 }}>
                        ❤️ {nextMonster.health} · ⚔️ {nextMonster.attack}
                      </Text>
                      <Text style={{ color: '#faad14', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                        🎁 通关 +{nextMonster.rewardPoints ?? 0} 积分
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statGrid}>
                    {[
                      ['暴击', nextMonster.critRate],
                      ['闪避', nextMonster.dodgeRate],
                      ['格挡', nextMonster.blockRate],
                      ['连击', nextMonster.comboRate],
                    ].map(([label, val]) =>
                      (val ?? 0) > 0 ? (
                        <Text key={String(label)} style={{ color: theme.text, fontSize: 12 }}>
                          {label} {((val as number) * 100).toFixed(0)}%
                        </Text>
                      ) : null,
                    )}
                  </View>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.challengeBtn, { backgroundColor: floorTheme.color }]}
                  onPress={handleChallenge}
                >
                  <Text style={styles.challengeBtnText}>⚡ 挑战第 {nextFloor} 层</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewBtn} onPress={() => openPreview(nextFloor)}>
                  <Text style={{ color: theme.tint, fontWeight: '600' }}>预览</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.progressCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>🚀 爬塔进度</Text>
              <View style={styles.towerVisual}>
                {towerFloors.map((floor) => {
                  const isPassed = floor <= currentFloor;
                  const isCurrent = floor === nextFloor;
                  const t = getFloorTheme(floor);
                  return (
                    <TouchableOpacity
                      key={floor}
                      style={styles.towerFloor}
                      onPress={() => openPreview(floor)}
                    >
                      <Text style={{ fontSize: 11, color: theme.icon }}>{floor}F</Text>
                      <View
                        style={[
                          styles.towerBar,
                          {
                            backgroundColor: isPassed || isCurrent ? t.color : theme.border,
                            opacity: isPassed ? 1 : isCurrent ? 0.85 : 0.35,
                          },
                        ]}
                      />
                      {isCurrent && <Text style={{ fontSize: 9, color: t.color }}>当前</Text>}
                      {isPassed && <Text style={{ fontSize: 9, color: '#52c41a' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.rankCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>🏆 爬塔排行榜</Text>
              {ranking.length === 0 ? (
                <Text style={{ color: theme.icon, textAlign: 'center', paddingVertical: 20 }}>暂无数据</Text>
              ) : (
                ranking.map((row, idx) => (
                  <View key={`${row.userId}-${idx}`} style={[styles.rankRow, { borderColor: theme.border }]}>
                    <Text style={[styles.rankNo, row.rank <= 3 && { color: '#faad14' }]}>
                      {row.rank ?? idx + 1}
                    </Text>
                    <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>
                      {row.userName || '未知'}
                    </Text>
                    <Text style={{ color: theme.tint, fontWeight: '700' }}>{row.maxFloor ?? 0} 层</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>第 {previewFloor} 层怪物</Text>
            {previewLoading ? (
              <ActivityIndicator color={theme.tint} style={{ marginVertical: 20 }} />
            ) : previewMonster ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
                  {previewMonster.name ?? '守卫'}
                </Text>
                <Text style={{ color: theme.icon }}>血量 {previewMonster.health} · 攻击 {previewMonster.attack}</Text>
                <Text style={{ color: '#faad14' }}>奖励 {previewMonster.rewardPoints ?? 0} 积分</Text>
              </View>
            ) : (
              <Text style={{ color: theme.icon }}>暂无怪物数据</Text>
            )}
            <TouchableOpacity
              style={[styles.modalOk, { backgroundColor: theme.tint }]}
              onPress={() => setPreviewVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 28 },
  pageHeader: { alignItems: 'center', marginBottom: 16 },
  titleIcon: { fontSize: 36 },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#722ed1',
    marginTop: 4,
  },
  pageSub: { color: '#8c8c8c', fontSize: 13, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', marginTop: 4, color: '#262626' },
  statBlue: { borderLeftWidth: 3, borderLeftColor: '#1890ff' },
  statPurple: { borderLeftWidth: 3, borderLeftColor: '#722ed1' },
  statOrange: { borderLeftWidth: 3, borderLeftColor: '#fa8c16' },
  statGreen: { borderLeftWidth: 3, borderLeftColor: '#52c41a' },
  challengeCard: { borderRadius: 14, padding: 14, marginBottom: 12, overflow: 'hidden' },
  floorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  floorNum: { fontSize: 36, fontWeight: '900' },
  zoneTag: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  monsterSection: { marginBottom: 12 },
  monsterRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  monsterAvatar: { width: 64, height: 64, borderRadius: 12 },
  monsterName: { fontSize: 16, fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  challengeBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  challengeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  previewBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  progressCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  towerVisual: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, justifyContent: 'center' },
  towerFloor: { alignItems: 'center', gap: 4, minWidth: 28 },
  towerBar: { width: 20, height: 48, borderRadius: 4 },
  rankCard: { borderRadius: 14, padding: 14 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rankNo: { width: 28, fontWeight: '800', textAlign: 'center', color: '#595959' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  modalOk: { marginTop: 16, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
});
