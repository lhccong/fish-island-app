import { ChatMessage } from '@/api/chat';
import { chatApi } from '@/api/chat';
import { toast } from '@/utils/toast';
import {
  formatRedPacketTypeLabel,
  getRedPacketDisplayName,
  getRedPacketRemainingCount,
  getRedPacketTotalAmount,
  getRedPacketTotalCount,
  isRedPacketFinished,
  normalizeRedPacketType,
  parseRedPacketContent,
  type RedPacketApiDetail,
} from '@/utils/redPacket';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
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
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerInput, setAnswerInput] = useState('');

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
  const packetType = normalizeRedPacketType(detail?.type ?? parsed?.type);
  const typeLabel = formatRedPacketTypeLabel(packetType);
  const isQuizPacket = packetType === 'quiz';

  const canGrab = Boolean(parsed?.redPacketId) && !finished && grabbedAmount === null && !grabbing;

  const performGrab = async (userAnswer?: string) => {
    if (!parsed?.redPacketId) return;

    setGrabbing(true);
    try {
      const response = await chatApi.grabRedPacket(parsed.redPacketId, userAnswer);
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

  const handleGrab = () => {
    if (!parsed?.redPacketId || grabbing || grabbedAmount !== null) return;

    if (isQuizPacket) {
      setAnswerInput('');
      setShowAnswerModal(true);
      return;
    }

    performGrab();
  };

  const handleSubmitAnswer = () => {
    const trimmed = answerInput.trim();
    if (!trimmed) {
      toast.error('答案不能为空');
      return;
    }
    setShowAnswerModal(false);
    performGrab(trimmed);
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
          <Text style={styles.typeLabel}>{typeLabel}</Text>
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
            <Text style={styles.grabButtonText}>
              {isQuizPacket ? '答题抢红包' : '抢红包'}
            </Text>
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

      <Modal
        visible={showAnswerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnswerModal(false)}
      >
        <View style={styles.answerOverlay}>
          <View style={styles.answerModal}>
            <Text style={styles.answerTitle}>答题红包</Text>
            <Text style={styles.answerQuestion} numberOfLines={3}>
              {displayName}
            </Text>
            <TextInput
              style={styles.answerInput}
              value={answerInput}
              onChangeText={setAnswerInput}
              placeholder="请输入你的答案"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.answerActions}>
              <TouchableOpacity
                style={styles.answerCancelBtn}
                onPress={() => setShowAnswerModal(false)}
              >
                <Text style={styles.answerCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.answerSubmitBtn}
                onPress={handleSubmitAnswer}
                disabled={grabbing}
              >
                <Text style={styles.answerSubmitText}>提交答案</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  answerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  answerModal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  answerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  answerQuestion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  answerInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
  },
  answerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  answerCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  answerCancelText: {
    fontSize: 14,
    color: '#666',
  },
  answerSubmitBtn: {
    backgroundColor: '#ff4d4f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  answerSubmitText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
