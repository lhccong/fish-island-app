import { luckyBagApi, LuckyBag, LuckyBagWinRecord } from '@/api/luckyBag';
import {
  getLuckyBagDrawTime,
  getLuckyBagStatusText,
  getLuckyBagTypeLabel,
  isLuckyBagJoinDisabled,
  LUCKY_BAG_IMAGE,
} from '@/utils/luckyBag';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface LuckyBagDetailModalProps {
  visible: boolean;
  luckyBagId: string | null;
  onClose: () => void;
  onJoined?: () => void;
}

export default function LuckyBagDetailModal({
  visible,
  luckyBagId,
  onClose,
  onJoined,
}: LuckyBagDetailModalProps) {
  const [detail, setDetail] = useState<LuckyBag | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [recordsVisible, setRecordsVisible] = useState(false);
  const [records, setRecords] = useState<LuckyBagWinRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!luckyBagId) return;
    setLoading(true);
    try {
      const res = await luckyBagApi.getDetail(luckyBagId);
      if (res.code === 0 && res.data) {
        setDetail(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [luckyBagId]);

  useEffect(() => {
    if (visible && luckyBagId) {
      setRecordsVisible(false);
      fetchDetail();
    }
  }, [visible, luckyBagId, fetchDetail]);

  const handleJoin = async () => {
    if (!luckyBagId || joining) return;
    setJoining(true);
    try {
      const res = await luckyBagApi.join(luckyBagId);
      if (res.code === 0 && res.data) {
        toast.success('参与成功，等待开奖！');
        await fetchDetail();
        onJoined?.();
      } else {
        toast.error(res.msg || res.message || '参与失败，福袋可能已结束！');
      }
    } catch {
      toast.error('参与失败，福袋可能已结束！');
    } finally {
      setTimeout(() => setJoining(false), 500);
    }
  };

  const openRecords = async () => {
    if (!luckyBagId) return;
    setRecordsVisible(true);
    setRecordsLoading(true);
    try {
      const res = await luckyBagApi.getRecords(luckyBagId);
      if (res.code === 0 && res.data) {
        setRecords([...res.data].sort((a, b) => (b.amount || 0) - (a.amount || 0)));
      } else {
        setRecords([]);
      }
    } catch {
      toast.error('获取福袋记录失败！');
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const joinDisabled = isLuckyBagJoinDisabled(detail) || joining;

  return (
    <>
      <Modal visible={visible && !recordsVisible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>福袋详情</Text>
            {loading ? (
              <ActivityIndicator style={{ padding: 32 }} color="#d46b08" />
            ) : (
              <ScrollView>
                <View style={styles.header}>
                  <Image source={{ uri: LUCKY_BAG_IMAGE }} style={styles.headerImage} contentFit="contain" />
                  <View style={styles.headerInfo}>
                    <Text style={styles.bagName}>{detail?.name || '福袋'}</Text>
                    {detail?.creatorName ? (
                      <Text style={styles.creator}>发起人：{detail.creatorName}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.metaGrid}>
                  <Text style={styles.metaItem}>总积分 {detail?.totalAmount ?? '-'}</Text>
                  <Text style={styles.metaItem}>中奖 {detail?.winnerCount ?? '-'} 人</Text>
                  <Text style={styles.metaItem}>参与 {detail?.participantCount ?? 0} 人</Text>
                  <Text style={styles.metaItem}>{getLuckyBagTypeLabel(detail?.type)}</Text>
                </View>
                <Text style={styles.drawTime}>开奖时间：{getLuckyBagDrawTime(detail ?? undefined)}</Text>
                <Text style={styles.status}>
                  {getLuckyBagStatusText(detail?.status)}
                  {detail?.joined !== undefined ? (detail.joined ? ' · 已参与' : ' · 未参与') : ''}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, joinDisabled && styles.btnDisabled]}
                    disabled={joinDisabled}
                    onPress={handleJoin}
                  >
                    <Text style={styles.primaryBtnText}>{detail?.joined ? '已参与' : '参与福袋'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={openRecords}>
                    <Text style={styles.secondaryBtnText}>查看记录</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>关闭</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={recordsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecordsVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setRecordsVisible(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>福袋中奖记录</Text>
            {recordsLoading ? (
              <ActivityIndicator style={{ padding: 32 }} color="#d46b08" />
            ) : records.length === 0 ? (
              <Text style={styles.emptyRecords}>暂无中奖记录</Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {records.map((record, index) => (
                  <View key={String(record.id ?? index)} style={styles.recordRow}>
                    <Text style={styles.recordName}>
                      {record.userName}
                      {index === 0 ? ' 🏆' : ''}
                    </Text>
                    <Text style={styles.recordAmount}>{record.amount} 积分</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setRecordsVisible(false)}>
              <Text style={styles.closeBtnText}>返回</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff7e6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd591',
    marginBottom: 12,
  },
  headerImage: {
    width: 72,
    height: 72,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bagName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d46b08',
  },
  creator: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaItem: {
    flexBasis: '48%',
    padding: 8,
    backgroundColor: '#fafafa',
    borderRadius: 6,
    fontSize: 13,
    color: '#595959',
  },
  drawTime: {
    textAlign: 'center',
    fontSize: 13,
    color: '#ad6800',
    backgroundColor: '#fff7e6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  status: {
    textAlign: 'center',
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#d46b08',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#595959',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  closeBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#8c8c8c',
    fontSize: 14,
  },
  emptyRecords: {
    textAlign: 'center',
    padding: 32,
    color: '#999',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  recordName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  recordAmount: {
    fontSize: 14,
    color: '#d46b08',
    fontWeight: '600',
  },
});
