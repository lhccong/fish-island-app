import { bossApi } from '@/api/boss';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PetBossPanel() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bossList, setBossList] = useState<any[]>([]);
  const [rankingVisible, setRankingVisible] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingList, setRankingList] = useState<any[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bossApi.getBossListWithCache();
      if (res?.code === 0) {
        setBossList(res.data || []);
      } else {
        setBossList([]);
      }
    } catch {
      setBossList([]);
      toast.error('获取 BOSS 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRanking = async (bossId: number | string) => {
    setRankingVisible(true);
    setRankingLoading(true);
    setRankingList([]);
    try {
      const res = await bossApi.getBossChallengeRanking(bossId, 20);
      setRankingList(res?.code === 0 ? res.data || [] : []);
    } catch {
      toast.error('获取排行榜失败');
    } finally {
      setRankingLoading(false);
    }
  };

  const formatRate = (v?: number) => (v ? `${(v * 100).toFixed(0)}%` : null);

  if (loading) {
    return <ActivityIndicator color={theme.tint} style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>⚡ 世界BOSS - 黑心老板</Text>
        <Text style={[styles.headerSub, { color: theme.icon }]}>
          全服玩家联合攻打黑心老板，共同获得奖励！
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {bossList.length === 0 ? (
          <Text style={[styles.empty, { color: theme.icon }]}>暂无 BOSS 数据</Text>
        ) : (
          bossList.map((boss) => (
            <View key={boss.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardTop}>
                {boss.avatar ? (
                  <Image source={{ uri: boss.avatar }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarEmoji}>👔</Text>
                )}
                <View style={styles.cardInfo}>
                  <Text style={[styles.bossName, { color: theme.text }]}>{boss.name || '未知BOSS'}</Text>
                  <Text style={{ color: theme.icon, fontSize: 12 }}>
                    血量: {boss.health ?? boss.currentHealth ?? 0}
                    {boss.attack != null ? ` · 攻击: ${boss.attack}` : ''}
                  </Text>
                  <View style={styles.extraStats}>
                    {formatRate(boss.critRate) && <Text style={styles.extraTag}>💥{formatRate(boss.critRate)}</Text>}
                    {formatRate(boss.dodgeRate) && <Text style={styles.extraTag}>💨{formatRate(boss.dodgeRate)}</Text>}
                    {formatRate(boss.blockRate) && <Text style={styles.extraTag}>🛡️{formatRate(boss.blockRate)}</Text>}
                  </View>
                  {boss.rewardPoints != null && (
                    <Text style={[styles.reward, { color: theme.tint }]}>
                      讨伐奖励: 💰 {boss.rewardPoints} 摸鱼币
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.challengeBtn, { backgroundColor: theme.tint }]}
                  onPress={() => router.push(`/pet/fight?bossId=${boss.id}`)}
                >
                  <Text style={styles.challengeBtnText}>联合讨伐</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rankBtn, { borderColor: theme.tint }]}
                  onPress={() => openRanking(boss.id)}
                >
                  <Text style={[styles.rankBtnText, { color: theme.tint }]}>🏆 排行榜</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={rankingVisible} transparent animationType="fade" onRequestClose={() => setRankingVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>挑战排行榜</Text>
            <Text style={[styles.modalTip, { color: theme.icon }]}>点击行可查看该玩家宠物详情</Text>
            {rankingLoading ? (
              <ActivityIndicator color={theme.tint} style={{ marginVertical: 24 }} />
            ) : rankingList.length === 0 ? (
              <Text style={{ color: theme.icon, textAlign: 'center', marginVertical: 20 }}>暂无数据</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {rankingList.map((row, index) => (
                  <View key={`${row.userId}-${index}`} style={[styles.rankRow, { borderColor: theme.border }]}>
                    <Text style={[styles.rankNo, { color: theme.tint }]}>{row.rank ?? index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{row.userName || '未知'}</Text>
                      {row.petName && <Text style={{ color: theme.icon, fontSize: 12 }}>{row.petName}</Text>}
                    </View>
                    <Text style={{ color: theme.text }}>{row.damage ?? row.totalDamage ?? '-'}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: theme.tint }]} onPress={() => setRankingVisible(false)}>
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { borderRadius: 10, padding: 14, marginBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  headerSub: { fontSize: 13, lineHeight: 18 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 12 },
  avatarEmoji: { fontSize: 48, width: 72, textAlign: 'center' },
  cardInfo: { flex: 1 },
  bossName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  extraStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  extraTag: { fontSize: 11, color: '#666' },
  reward: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  challengeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  challengeBtnText: { color: '#fff', fontWeight: '600' },
  rankBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  rankBtnText: { fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 12, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  modalTip: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  rankNo: { width: 28, fontWeight: '700', textAlign: 'center' },
  modalClose: { marginTop: 14, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: '600' },
});
