import { ChatMessage } from '@/api/chat';
import { chatApi } from '@/api/chat';
import { toast } from '@/utils/toast';
import {
  getRedPacketDisplayName,
  getRedPacketRemainingCount,
  getRedPacketTotalAmount,
  getRedPacketTotalCount,
  isRedPacketFinished,
  parseRedPacketContent,
} from '@/utils/redPacket';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface RedPacketMessageCardProps {
  message: ChatMessage;
  onViewDetails: (message: ChatMessage) => void;
}

export default function RedPacketMessageCard({
  message,
  onViewDetails,
}: RedPacketMessageCardProps) {
  const parsed = useMemo(
    () => parseRedPacketContent(message.content || message.md),
    [message.content, message.md],
  );

  const [detail, setDetail] = useState<RedPacketApiDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const [grabbedAmount, setGrabbedAmount] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    const redPacketId = parsed?.redPacketId;
    if (!redPacketId) return;

    setLoadingDetail(true);
    try {
      const response = await chatApi.getRedPacketDetail(redPacketId);
      if (response.code === 0 && response.data) {
        setDetail(response.data);
      }
    } catch (error) {
      console.error('获取红包详情失败:', error);
    } finally {
      setLoadingDetail(false);
    }
  }, [parsed?.redPacketId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const finished = isRedPacketFinished(parsed, detail);
  const remaining = getRedPacketRemainingCount(parsed, detail);
  const total = getRedPacketTotalCount(parsed, detail);
  const amount = getRedPacketTotalAmount(parsed, detail);
  const displayName = getRedPacketDisplayName(parsed, detail);

  const canGrab = Boolean(parsed?.redPacketId) && !finished && grabbedAmount === null && !grabbing;

  const handleGrab = async () => {
    if (!parsed?.redPacketId || grabbing || grabbedAmount !== null) return;

    setGrabbing(true);
    try {
      const response = await chatApi.grabRedPacket(parsed.redPacketId);
      if (response.code === 0 && response.data !== undefined) {
        const grabbed = Number(response.data);
        setGrabbedAmount(grabbed);
        toast.success(`恭喜！抢到 ${grabbed} 积分`);
        await loadDetail();
      } else {
        toast.error(response.msg || response.message || '抢红包失败');
      }
    } catch (error) {
      console.error('抢红包失败:', error);
      toast.error('抢红包失败，请重试');
    } finally {
      setGrabbing(false);
    }
  };

  if (!parsed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>红包</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, finished && styles.cardFinished]}>
      <View style={styles.contentRow}>
        <Text style={styles.icon}>🧧</Text>
        <View style={styles.info}>
          <Text style={styles.typeLabel}>红包</Text>
          <Text style={styles.msgText} numberOfLines={2}>
            {displayName}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.amountText}>
          {loadingDetail && amount === 0 ? '...' : amount}
          <Text style={styles.amountUnit}> 积分</Text>
        </Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {finished ? '已领完' : `剩余${remaining}/${total}个`}
          </Text>
        </View>
      </View>

      {grabbedAmount !== null && (
        <View style={styles.grabbedResult}>
          <Text style={styles.grabbedResultText}>已抢到 {grabbedAmount} 积分</Text>
        </View>
      )}

      {canGrab && (
        <TouchableOpacity
          style={[styles.grabButton, grabbing && styles.grabButtonDisabled]}
          onPress={handleGrab}
          disabled={grabbing}
          activeOpacity={0.85}
        >
          {grabbing ? (
            <ActivityIndicator color="#ff4d4f" size="small" />
          ) : (
            <Text style={styles.grabButtonText}>抢红包</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.viewDetailsButton}
        onPress={() => onViewDetails(message)}
        activeOpacity={0.8}
      >
        <Text style={styles.viewDetailsText}>查看详情</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ff4d4f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardFinished: {
    backgroundColor: '#a8071a',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  msgText: {
    fontSize: 12,
    color: '#fffbe6',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  amountUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#fffbe6',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#fffbe6',
  },
  grabButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  grabButtonDisabled: {
    opacity: 0.7,
  },
  grabButtonText: {
    color: '#ff4d4f',
    fontSize: 14,
    fontWeight: '600',
  },
  viewDetailsButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  viewDetailsText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '500',
  },
  grabbedResult: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#52c41a',
    alignItems: 'center',
  },
  grabbedResultText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  fallback: {
    padding: 8,
  },
  fallbackText: {
    color: '#ff4d4f',
  },
});
