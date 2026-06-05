import { chatApi } from '@/api/chat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { normalizeRedPacketType } from '@/utils/redPacket';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface RedPacketDetailModalProps {
  visible: boolean;
  onClose: () => void;
  redPacketId: string | null;
  senderName?: string;
  senderAvatar?: string;
  msg?: string;
}

export default function RedPacketDetailModal({
  visible,
  onClose,
  redPacketId,
  senderName,
  senderAvatar,
  msg,
}: RedPacketDetailModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo } = useUser();

  const [detail, setDetail] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!redPacketId) return;

    setLoading(true);
    try {
      const [detailRes, recordsRes] = await Promise.all([
        chatApi.getRedPacketDetail(redPacketId),
        chatApi.getRedPacketRecords(redPacketId),
      ]);

      if (detailRes.code === 0) {
        setDetail(detailRes.data);
      }
      if (recordsRes.code === 0) {
        setRecords(recordsRes.data || []);
      }
    } catch (error) {
      console.error('获取红包详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [redPacketId]);

  useEffect(() => {
    if (visible && redPacketId) {
      fetchDetail();
    } else if (!visible) {
      setDetail(null);
      setRecords([]);
    }
  }, [visible, redPacketId, fetchDetail]);

  const formatTime = (time: string) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getUserMoney = (receiver: any): number => {
    if (!receiver) return 0;
    return receiver.amount ?? receiver.userMoney ?? receiver.money ?? 0;
  };

  const packetType = normalizeRedPacketType(detail?.type);

  const isLuckyKing = (receiver: any) => {
    if (!records.length) return false;
    if (
      packetType === 'average' ||
      packetType === 'quiz' ||
      packetType === 'specify' ||
      packetType === 'rockPaperScissors'
    ) {
      return false;
    }

    const maxMoney = Math.max(...records.map((w) => getUserMoney(w)));
    if (maxMoney <= 0) return false;

    const firstMaxIndex = records.findIndex((w) => getUserMoney(w) === maxMoney);
    const currentIndex = records.indexOf(receiver);

    return getUserMoney(receiver) === maxMoney && currentIndex === firstMaxIndex;
  };

  const getGestureName = (gesture?: number) => {
    const map: Record<number, string> = {
      0: '石头',
      1: '剪刀',
      2: '布',
    };
    return gesture !== undefined ? map[gesture] : '';
  };

  const displaySenderName = senderName || detail?.senderName || '未知用户';
  const displayAvatar =
    senderAvatar ||
    detail?.senderAvatar ||
    'https://api.yucoder.cn/images/default-avatar.png';
  const displayMsg = msg || detail?.name || detail?.msg || '红包';
  const displayGot = records.length || detail?.got || 0;
  const displayCount = detail?.count || 0;
  const displayAmount = detail?.totalAmount ?? detail?.money ?? 0;

  const sortedRecords = [...records].sort((a, b) => getUserMoney(b) - getUserMoney(a));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconSymbol name="xmark" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.senderInfo}>
              <Image source={{ uri: displayAvatar }} style={styles.senderAvatar} />
              <Text style={styles.senderName}>{displaySenderName}</Text>
              {packetType === 'rockPaperScissors' && (
                <View style={styles.gestureTag}>
                  <Text style={styles.gestureText}>{getGestureName(detail?.gesture)}</Text>
                </View>
              )}
            </View>

            <Text style={styles.messageText}>{displayMsg}</Text>

            <View style={styles.amountSection}>
              <Text style={styles.amountText}>
                {displayAmount}
                <Text style={styles.amountUnit}> 积分</Text>
              </Text>
              <Text style={styles.redPacketInfo}>
                {displayGot}/{displayCount}个红包
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={[styles.listTitle, { color: theme.text }]}>
              已领取 {displayGot}/{displayCount}
            </Text>

            {loading ? (
              <ActivityIndicator style={styles.loader} color={theme.tint} />
            ) : (
              <ScrollView style={styles.receiverList} showsVerticalScrollIndicator={false}>
                {sortedRecords.map((receiver, index) => {
                  const avatarUrl = receiver.userAvatar || receiver.avatar || '';
                  return (
                    <View
                      key={`${receiver.id || receiver.userId}-${index}`}
                      style={styles.receiverItem}
                    >
                      <Image
                        source={
                          avatarUrl
                            ? { uri: avatarUrl }
                            : { uri: 'https://api.yucoder.cn/images/default-avatar.png' }
                        }
                        style={styles.receiverAvatar}
                        resizeMode="cover"
                      />
                      <View style={styles.receiverInfo}>
                        <View style={styles.receiverNameRow}>
                          <Text
                            style={[styles.receiverName, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {receiver.userName}
                          </Text>
                          {String(receiver.userId) === String(userInfo?.id) && (
                            <View style={styles.currentUserTag}>
                              <Text style={styles.tagText}>我</Text>
                            </View>
                          )}
                          {isLuckyKing(receiver) && (
                            <View style={styles.luckyKingTag}>
                              <Text style={styles.tagText}>手气王</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.receiverTime, { color: theme.icon }]}>
                          {formatTime(receiver.grabTime || receiver.time)}
                        </Text>
                      </View>
                      <Text style={styles.receiverAmount}>{getUserMoney(receiver)} 积分</Text>
                    </View>
                  );
                })}

                {sortedRecords.length === 0 && (
                  <Text style={[styles.emptyText, { color: theme.icon }]}>
                    还没有人领取红包
                  </Text>
                )}
              </ScrollView>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#ff4d4f',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  senderName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  gestureTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  gestureText: {
    color: '#fff',
    fontSize: 12,
  },
  messageText: {
    color: '#fffbe6',
    fontSize: 14,
    marginBottom: 16,
  },
  amountSection: {
    alignItems: 'center',
  },
  amountText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  amountUnit: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  redPacketInfo: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  body: {
    padding: 16,
    maxHeight: 300,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  loader: {
    marginTop: 20,
  },
  receiverList: {
    maxHeight: 240,
  },
  receiverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  receiverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  receiverInfo: {
    flex: 1,
  },
  receiverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiverName: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  currentUserTag: {
    backgroundColor: '#ff4d4f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  luckyKingTag: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
  },
  receiverTime: {
    fontSize: 11,
    marginTop: 2,
  },
  receiverAmount: {
    color: '#ff4d4f',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  closeButtonText: {
    fontSize: 14,
  },
});
