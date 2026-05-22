import { petEquipForgeApi } from '@/api/petEquipForge';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ForgeDetail,
  ENTRY_GRADE_COLOR,
  ENTRY_GRADE_NAME,
  formatEntryValue,
  getEntryAttrName,
  getForgeEntries,
  syncLockedFromDetail,
} from '@/utils/petForge';
import { toast } from '@/utils/toast';
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

interface PetEquipForgeModalProps {
  visible: boolean;
  petId?: number;
  equipSlot?: number;
  slotName: string;
  readOnly?: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function PetEquipForgeModal({
  visible,
  petId,
  equipSlot,
  slotName,
  readOnly = false,
  onClose,
  onUpdated,
}: PetEquipForgeModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [detail, setDetail] = useState<ForgeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockedEntries, setLockedEntries] = useState<number[]>([]);

  const loadDetail = useCallback(async () => {
    if (!petId || !equipSlot) return;
    setDetailLoading(true);
    try {
      const res = await petEquipForgeApi.getForgeDetail({ petId, equipSlot });
      if (res?.code === 0 && res.data) {
        const data = res.data as ForgeDetail;
        setDetail(data);
        setLockedEntries(syncLockedFromDetail(data));
      } else {
        setDetail(null);
        toast.error(res?.message || res?.msg || '获取锻造详情失败');
      }
    } catch (e: any) {
      setDetail(null);
      toast.error(e?.message || '获取锻造详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, [petId, equipSlot]);

  useEffect(() => {
    if (visible && petId && equipSlot) {
      setDetail(null);
      setLockedEntries([]);
      loadDetail();
    }
    if (!visible) {
      setDetail(null);
      setLockedEntries([]);
    }
  }, [visible, petId, equipSlot, loadDetail]);

  const handleClose = () => {
    setDetail(null);
    setLockedEntries([]);
    onClose();
  };

  const handleUpgrade = async () => {
    if (!petId || !equipSlot) return;
    setUpgradeLoading(true);
    try {
      const res = await petEquipForgeApi.upgradeEquip({ petId, equipSlot });
      if (res?.code === 0) {
        toast.success(res.data ? '升级成功！' : '升级失败，运气不佳');
        await loadDetail();
        await onUpdated?.();
      } else {
        toast.error(res?.message || res?.msg || '升级失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '升级失败');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!petId || !equipSlot) return;
    setRefreshLoading(true);
    try {
      const res = await petEquipForgeApi.refreshEntries({ petId, equipSlot });
      if (res?.code === 0 && res.data) {
        toast.success('词条刷新成功');
        const data = res.data as ForgeDetail;
        setDetail((prev) => ({
          ...(prev || {}),
          entry1: data.entry1,
          entry2: data.entry2,
          entry3: data.entry3,
          entry4: data.entry4,
        }));
        setLockedEntries(syncLockedFromDetail(data));
        await onUpdated?.();
      } else {
        toast.error(res?.message || res?.msg || '刷新失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '刷新失败');
    } finally {
      setRefreshLoading(false);
    }
  };

  const toggleEntryLock = async (entryIndex: number) => {
    if (!petId || !equipSlot || lockLoading) return;
    const nextLocked = lockedEntries.includes(entryIndex)
      ? lockedEntries.filter((v) => v !== entryIndex)
      : [...lockedEntries, entryIndex];
    setLockLoading(true);
    try {
      const res = await petEquipForgeApi.lockEntries({
        petId,
        equipSlot,
        lockedEntries: nextLocked,
      });
      if (res?.code === 0 && res.data) {
        const data = res.data as ForgeDetail;
        setLockedEntries(syncLockedFromDetail(data));
        setDetail((prev) => ({
          ...(prev || {}),
          entry1: data.entry1,
          entry2: data.entry2,
          entry3: data.entry3,
          entry4: data.entry4,
        }));
      } else {
        toast.error(res?.message || res?.msg || '锁定失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '锁定失败');
    } finally {
      setLockLoading(false);
    }
  };

  const entries = getForgeEntries(detail);
  const title = readOnly ? `装备词条 - ${slotName}` : `装备锻造 - ${slotName}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {readOnly ? '🔍 ' : '🔨 '}
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.icon }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : detail ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
              <View style={styles.levelRow}>
                <Text style={[styles.levelLabel, { color: theme.text }]}>
                  装备等级：
                  <Text style={styles.levelTag}> Lv.{detail.equipLevel ?? 0}</Text>
                </Text>
                {detail.maxLevel && (
                  <View style={styles.maxTag}>
                    <Text style={styles.maxTagText}>已达最高等级</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.icon }]}>词条属性</Text>
              {entries.length === 0 ? (
                <Text style={[styles.emptyEntries, { color: theme.icon }]}>
                  暂无词条，升级后解锁
                </Text>
              ) : (
                entries.map(({ index, data }) => {
                  const entry = data!;
                  const isLocked = readOnly
                    ? !!entry.locked
                    : lockedEntries.includes(index);
                  const grade = entry.grade || 1;
                  const attr = entry.attr || '';
                  return (
                    <View
                      key={index}
                      style={[
                        styles.entryRow,
                        {
                          borderColor: isLocked ? '#fa8c16' : theme.border,
                          backgroundColor: isLocked ? '#fffbe6' : theme.background,
                        },
                      ]}
                    >
                      <View style={styles.entryLeft}>
                        <View
                          style={[
                            styles.gradeTag,
                            { backgroundColor: ENTRY_GRADE_COLOR[grade] || '#8c8c8c' },
                          ]}
                        >
                          <Text style={styles.gradeTagText}>
                            {ENTRY_GRADE_NAME[grade] || '白'}
                          </Text>
                        </View>
                        <Text style={[styles.entryAttr, { color: theme.text }]}>
                          {getEntryAttrName(attr)}
                        </Text>
                        <Text style={styles.entryValue}>
                          {formatEntryValue(attr, entry.value)}
                        </Text>
                      </View>
                      {!readOnly && (
                        <TouchableOpacity
                          style={[
                            styles.lockBtn,
                            isLocked && styles.lockBtnActive,
                          ]}
                          onPress={() => toggleEntryLock(index)}
                          disabled={lockLoading}
                        >
                          <Text
                            style={[
                              styles.lockBtnText,
                              isLocked && styles.lockBtnTextActive,
                            ]}
                          >
                            {isLocked ? '已锁定' : '锁定'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}

              {!readOnly && (
                <>
                  {!detail.maxLevel && (
                    <View style={styles.upgradeBox}>
                      <View style={styles.upgradeMeta}>
                        <Text style={[styles.upgradeMetaText, { color: theme.text }]}>
                          升级消耗：
                          <Text style={styles.costText}> {detail.nextUpgradeCost ?? 0} 积分</Text>
                        </Text>
                        <Text style={[styles.upgradeMetaText, { color: theme.text }]}>
                          成功率：
                          <Text style={styles.rateText}> {detail.successRate ?? 0}%</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: '#fa8c16' }]}
                        onPress={handleUpgrade}
                        disabled={upgradeLoading}
                      >
                        {upgradeLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.primaryBtnText}>
                            升级强化（消耗 {detail.nextUpgradeCost ?? 0} 积分）
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.refreshBox}>
                    <Text style={[styles.refreshHint, { color: theme.icon }]}>
                      刷新词条消耗 100 积分，已锁定的词条不会被刷新，每锁定一条额外 +50 积分
                    </Text>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { borderColor: theme.tint }]}
                      onPress={handleRefresh}
                      disabled={refreshLoading}
                    >
                      {refreshLoading ? (
                        <ActivityIndicator color={theme.tint} size="small" />
                      ) : (
                        <Text style={[styles.secondaryBtnText, { color: theme.tint }]}>
                          刷新词条
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔨</Text>
              <Text style={[styles.emptyText, { color: theme.icon }]}>
                暂无锻造数据，请先穿戴装备
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700', flex: 1, paddingRight: 8 },
  close: { fontSize: 20 },
  loader: { paddingVertical: 40 },
  body: { maxHeight: 480 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  levelLabel: { fontSize: 15, fontWeight: '600' },
  levelTag: { color: '#1890ff', fontWeight: '700' },
  maxTag: {
    backgroundColor: '#fffbe6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  maxTagText: { color: '#d48806', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 13, marginBottom: 8 },
  emptyEntries: { textAlign: 'center', paddingVertical: 16 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  gradeTag: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  gradeTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  entryAttr: { fontSize: 14, fontWeight: '500' },
  entryValue: { color: '#52c41a', fontWeight: '700', fontSize: 14 },
  lockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    marginLeft: 8,
  },
  lockBtnActive: { borderColor: '#fa8c16', backgroundColor: '#fff7e6' },
  lockBtnText: { fontSize: 12, color: '#666' },
  lockBtnTextActive: { color: '#fa8c16', fontWeight: '600' },
  upgradeBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  upgradeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  upgradeMetaText: { fontSize: 13 },
  costText: { color: '#fa8c16', fontWeight: '700' },
  rateText: { color: '#1890ff', fontWeight: '700' },
  primaryBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  refreshBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  refreshHint: { fontSize: 12, marginBottom: 10, lineHeight: 18 },
  secondaryBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 14 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
