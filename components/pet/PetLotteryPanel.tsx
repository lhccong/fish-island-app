import { turntableApi } from '@/api/turntable';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ANIMATION_SEQUENCE = [0, 1, 2, 5, 8, 7, 6, 3, 4];

const QUALITY_BORDER: Record<number, string> = {
  0: '#d9d9d9',
  1: '#52c41a',
  2: '#1890ff',
  3: '#722ed1',
  4: '#fa8c16',
};

type Prize = {
  id?: number;
  prizeId?: number;
  name?: string;
  icon?: string;
  quality?: number;
  qualityName?: string;
};

function PrizeCell({
  prize,
  index,
  active,
  theme,
}: {
  prize: Prize;
  index: number;
  active: boolean;
  theme: typeof Colors.light;
}) {
  const borderColor = QUALITY_BORDER[prize.quality ?? 0] ?? QUALITY_BORDER[0];
  const icon = prize.icon || '🎁';
  const isUrl = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/'));

  return (
    <View
      style={[
        styles.prizeCell,
        { backgroundColor: theme.card, borderColor: active ? theme.tint : borderColor },
        active && styles.prizeCellActive,
      ]}
    >
      {isUrl ? (
        <Image source={{ uri: icon }} style={styles.prizeIconImg} contentFit="contain" />
      ) : (
        <Text style={styles.prizeEmoji}>{icon}</Text>
      )}
      <Text style={[styles.prizeName, { color: theme.text }]} numberOfLines={1}>
        {prize.name || '奖品'}
      </Text>
      {prize.qualityName ? (
        <Text style={[styles.prizeQuality, { color: theme.icon }]}>{prize.qualityName}</Text>
      ) : null}
    </View>
  );
}

export default function PetLotteryPanel() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo, refreshUserInfo } = useUser();
  const availablePoints = (userInfo?.points ?? 0) - (userInfo?.usedPoints ?? 0);

  const [turntableList, setTurntableList] = useState<any[]>([]);
  const [activeTabKey, setActiveTabKey] = useState('');
  const [currentTurntable, setCurrentTurntable] = useState<any>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [turntableLoading, setTurntableLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [centerSpin, setCenterSpin] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [recordsPage, setRecordsPage] = useState({ current: 1, pageSize: 13, total: 0 });
  const [tenDrawResults, setTenDrawResults] = useState<any[]>([]);
  const [tenDrawVisible, setTenDrawVisible] = useState(false);
  const skipAnimRef = useRef(false);

  const isDailyFirstFree = useMemo(() => {
    const last = currentTurntable?.userProgress?.lastDrawTime;
    if (!last) return true;
    return new Date(last).toDateString() !== new Date().toDateString();
  }, [currentTurntable?.userProgress?.lastDrawTime]);

  const loadTurntableList = useCallback(async () => {
    try {
      const res = await turntableApi.listTurntables();
      if (res?.code === 0 && res.data?.length) {
        setTurntableList(res.data);
        setActiveTabKey(String(res.data[0].id));
      }
    } catch {
      toast.error('获取转盘列表失败');
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setTurntableLoading(true);
    try {
      const res = await turntableApi.getTurntableDetail(id);
      if (res?.code === 0 && res.data) {
        setCurrentTurntable(res.data);
        const list = res.data.prizeList || [];
        const filled: Prize[] = [];
        for (let i = 0; i < 9; i++) {
          filled.push(list[i] || { id: i, name: '暂无奖品', icon: '❓', quality: 0 });
        }
        setPrizes(filled);
      }
    } catch {
      toast.error('获取转盘详情失败');
    } finally {
      setTurntableLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async (turntableId: number, page = 1) => {
    try {
      const res = await turntableApi.listDrawRecords({
        turntableId,
        current: page,
        pageSize: recordsPage.pageSize,
      });
      if (res?.code === 0 && res.data) {
        const rows = (res.data.records || []).map((item: any) => ({
          id: item.id,
          prizeName: item.name || '',
          prizeIcon: item.icon || '🎁',
          drawTime: item.createTime || '',
          quality: item.quality,
        }));
        setRecords(rows);
        setRecordsPage((p) => ({
          ...p,
          current: page,
          total: res.data.total ?? 0,
        }));
      }
    } catch {
      /* ignore */
    }
  }, [recordsPage.pageSize]);

  useEffect(() => {
    loadTurntableList();
  }, [loadTurntableList]);

  useEffect(() => {
    if (!activeTabKey) return;
    const id = Number(activeTabKey);
    loadDetail(id);
    loadRecords(id, 1);
  }, [activeTabKey, loadDetail, loadRecords]);

  const runAnimation = (targetIndex: number) =>
    new Promise<void>((resolve) => {
      let step = 0;
      let speed = 80;
      const rounds = 3;
      const totalSteps =
        ANIMATION_SEQUENCE.length * rounds + ANIMATION_SEQUENCE.indexOf(targetIndex);

      const tick = () => {
        if (skipAnimRef.current) {
          setActiveIndex(null);
          resolve();
          return;
        }
        const seqIdx = step % ANIMATION_SEQUENCE.length;
        setActiveIndex(ANIMATION_SEQUENCE[seqIdx]);
        step++;
        if (step <= totalSteps) {
          if (step > totalSteps - 8) speed += 60;
          setTimeout(tick, speed);
        } else {
          setActiveIndex(targetIndex);
          setTimeout(() => {
            setActiveIndex(null);
            resolve();
          }, 300);
        }
      };
      tick();
    });

  const findPrizeIndex = (won: any) => {
    const idx = prizes.findIndex(
      (p) => p.prizeId === won.prizeId || p.id === won.prizeId,
    );
    return idx >= 0 ? idx : ANIMATION_SEQUENCE[Math.floor(Math.random() * ANIMATION_SEQUENCE.length)];
  };

  const afterDraw = async () => {
    const tid = currentTurntable?.id;
    if (tid) {
      await loadDetail(Number(tid));
      await loadRecords(Number(tid), recordsPage.current);
    }
    await refreshUserInfo();
  };

  const renderPrizeIcon = (icon?: string, size = 22) => {
    const v = icon || '🎁';
    if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('/'))) {
      return <Image source={{ uri: v }} style={{ width: size, height: size }} contentFit="contain" />;
    }
    return <Text style={{ fontSize: size }}>{v}</Text>;
  };

  const handleDraw = async (count: 1 | 10) => {
    if (drawing || !currentTurntable?.id) return;
    setDrawing(true);
    setCenterSpin(true);
    skipAnimRef.current = false;
    try {
      const res = await turntableApi.draw({
        turntableId: currentTurntable.id,
        drawCount: count,
      });
      if (res?.code !== 0 || !res.data?.prizeList?.length) {
        toast.error(res?.message || '抽奖失败');
        return;
      }
      const list = res.data.prizeList;
      const last = list[list.length - 1];
      await runAnimation(findPrizeIndex(last));

      if (count === 1) {
        const p = list[0];
        toast.success(`恭喜获得：${p.name || '奖品'}！`);
        setRecords((prev) => [
          {
            id: Date.now(),
            prizeName: p.name,
            prizeIcon: p.icon || '🎁',
            drawTime: new Date().toLocaleString('zh-CN'),
          },
          ...prev,
        ]);
      } else {
        setTenDrawResults(
          list.map((p: any, i: number) => ({
            id: Date.now() + i,
            prizeName: p.name,
            prizeIcon: p.icon || '🎁',
          })),
        );
        setTenDrawVisible(true);
        setRecords((prev) => [
          ...list.map((p: any, i: number) => ({
            id: Date.now() + i,
            prizeName: p.name,
            prizeIcon: p.icon || '🎁',
            drawTime: new Date().toLocaleString('zh-CN'),
          })),
          ...prev,
        ]);
      }
      await afterDraw();
    } catch (e: any) {
      toast.error(e?.message || '抽奖失败，请稍后重试');
    } finally {
      setDrawing(false);
      setCenterSpin(false);
    }
  };

  const cost = currentTurntable?.costPoints ?? 0;
  const guarantee = currentTurntable?.guaranteeCount ?? 0;
  const progress = currentTurntable?.userProgress?.totalDrawCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(recordsPage.total / recordsPage.pageSize));

  return (
    <ScrollView style={styles.wrap} showsVerticalScrollIndicator={false}>
      <View style={[styles.pointsBar, { backgroundColor: theme.card }]}>
        <Text style={{ fontSize: 16 }}>💎</Text>
        <Text style={[styles.pointsVal, { color: theme.text }]}>{availablePoints}</Text>
        <Text style={{ color: theme.icon, fontSize: 12 }}>可用摸鱼币</Text>
      </View>

      {turntableList.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {turntableList.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tab,
                { borderColor: theme.border },
                activeTabKey === String(t.id) && { borderColor: theme.tint, backgroundColor: theme.tint + '18' },
              ]}
              onPress={() => setActiveTabKey(String(t.id))}
            >
              {t.icon?.startsWith?.('http') ? (
                <Image source={{ uri: t.icon }} style={styles.tabIcon} />
              ) : (
                <Text>{t.icon || '🎡'}</Text>
              )}
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {turntableLoading ? (
        <ActivityIndicator color={theme.tint} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={styles.grid}>
            {prizes.map((prize, index) => (
              <PrizeCell
                key={`${prize.id}-${index}`}
                prize={prize}
                index={index}
                active={activeIndex === index || (drawing && centerSpin && index === 4)}
                theme={theme}
              />
            ))}
          </View>

          <View style={styles.drawRow}>
            <TouchableOpacity
              style={[styles.drawBtn, { backgroundColor: theme.tint }]}
              disabled={drawing}
              onPress={() => handleDraw(1)}
            >
              <Text style={styles.drawBtnTitle}>单抽</Text>
              <Text style={styles.drawBtnCost}>
                {isDailyFirstFree ? '🎁 免费' : `💎 ${cost}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.drawBtnTen, { borderColor: theme.tint }]}
              disabled={drawing}
              onPress={() => handleDraw(10)}
            >
              <Text style={[styles.drawBtnTitle, { color: theme.tint }]}>十连抽</Text>
              <Text style={[styles.drawBtnCost, { color: theme.icon }]}>💎 {cost * 10}</Text>
            </TouchableOpacity>
          </View>

          {guarantee > 0 && (
            <View style={[styles.guaranteeBox, { backgroundColor: theme.card }]}>
              <Text style={{ color: theme.text, fontSize: 13, marginBottom: 6 }}>保底进度</Text>
              <View style={[styles.guaranteeTrack, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.guaranteeFill,
                    { width: `${Math.min(100, (progress / guarantee) * 100)}%`, backgroundColor: theme.tint },
                  ]}
                />
              </View>
              <Text style={{ color: theme.icon, fontSize: 12, marginTop: 4 }}>
                {progress}/{guarantee} · 抽奖{guarantee}次必出传说奖励
              </Text>
            </View>
          )}
        </>
      )}

      <View style={[styles.recordsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.recordsTitle, { color: theme.text }]}>🏆 我的中奖记录</Text>
        {records.length === 0 ? (
          <Text style={{ color: theme.icon, textAlign: 'center', paddingVertical: 20 }}>暂无中奖记录</Text>
        ) : (
          records.map((r) => (
            <View key={r.id} style={[styles.recordRow, { borderColor: theme.border }]}>
              {renderPrizeIcon(r.prizeIcon, 28)}
              <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>
                恭喜我抽中 {r.prizeName}
              </Text>
            </View>
          ))
        )}
        {recordsPage.total > recordsPage.pageSize && (
          <View style={styles.pagination}>
            <TouchableOpacity
              disabled={recordsPage.current <= 1}
              onPress={() => {
                const p = recordsPage.current - 1;
                setRecordsPage((x) => ({ ...x, current: p }));
                loadRecords(Number(activeTabKey), p);
              }}
            >
              <Text style={{ color: theme.tint }}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.text }}>
              {recordsPage.current} / {totalPages}
            </Text>
            <TouchableOpacity
              disabled={recordsPage.current >= totalPages}
              onPress={() => {
                const p = recordsPage.current + 1;
                setRecordsPage((x) => ({ ...x, current: p }));
                loadRecords(Number(activeTabKey), p);
              }}
            >
              <Text style={{ color: theme.tint }}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={tenDrawVisible} transparent animationType="fade" onRequestClose={() => setTenDrawVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🎁 十连抽结果</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              <View style={styles.tenGrid}>
                {tenDrawResults.map((r) => (
                  <View key={r.id} style={[styles.tenItem, { borderColor: theme.border }]}>
                    {renderPrizeIcon(r.prizeIcon, 32)}
                    <Text style={{ color: theme.text, fontSize: 11, textAlign: 'center' }} numberOfLines={2}>
                      {r.prizeName}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalOk, { backgroundColor: theme.tint }]}
              onPress={() => setTenDrawVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  pointsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  pointsVal: { fontSize: 20, fontWeight: '700' },
  tabs: { marginBottom: 12, maxHeight: 48 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabIcon: { width: 20, height: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  prizeCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeCellActive: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.2,
    elevation: 4,
  },
  prizeEmoji: { fontSize: 28 },
  prizeIconImg: { width: 36, height: 36 },
  prizeName: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  prizeQuality: { fontSize: 9 },
  drawRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  drawBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  drawBtnTen: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 2 },
  drawBtnTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  drawBtnCost: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 },
  guaranteeBox: { borderRadius: 10, padding: 12, marginBottom: 12 },
  guaranteeTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  guaranteeFill: { height: '100%', borderRadius: 4 },
  recordsCard: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginBottom: 24 },
  recordsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  tenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tenItem: {
    width: '30%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  modalOk: { marginTop: 14, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
});
