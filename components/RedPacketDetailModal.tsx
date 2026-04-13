import { chatApi } from '@/api/chat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface RedPacketDetail {
  id: string;
  msg: string;
  money: number;
  count: number;
  got: number;
  type: string;
  who: Array<any>;
  info?: {
    userName: string;
    userAvatarURL48: string;
    gesture?: number;
    msg: string;
    got: number;
    count: number;
  };
}

interface RedPacketDetailModalProps {
  visible: boolean;
  onClose: () => void;
  redPacketId: string | null;
  senderName?: string;
  senderAvatar?: string;
  msg?: string;
  onGrabSuccess?: (data: any) => void;
}

export default function RedPacketDetailModal({
  visible,
  onClose,
  redPacketId,
  senderName,
  senderAvatar,
  msg,
  onGrabSuccess,
}: RedPacketDetailModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo } = useUser();

  const [detail, setDetail] = useState<RedPacketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const [hasGrabbed, setHasGrabbed] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!redPacketId) return;

    setLoading(true);
    try {
      const [detailRes, recordsRes] = await Promise.all([
        chatApi.getRedPacketDetail(redPacketId),
        chatApi.getRedPacketRecords(redPacketId),
      ]);

      if (detailRes.code === 0 && recordsRes.code === 0) {
        const redPacketData = {
          ...detailRes.data,
          who: recordsRes.data || [],
          info: {
            userName: senderName || detailRes.data?.senderName || '',
            userAvatarURL48: senderAvatar || detailRes.data?.senderAvatar || '',
            msg: msg || detailRes.data?.msg || '',
            got: detailRes.data?.got || 0,
            count: detailRes.data?.count || 0,
            gesture: detailRes.data?.gesture,
          },
        };
        setDetail(redPacketData);

        // 检查当前用户是否已经抢过
        const currentUserGrabbed = recordsRes.data?.some(
          (record: any) => record.userId === userInfo?.id
        );
        setHasGrabbed(currentUserGrabbed);
      }
    } catch (error) {
      console.error('获取红包详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [redPacketId, senderName, senderAvatar, msg, userInfo?.id]);

  useEffect(() => {
    if (visible && redPacketId) {
      fetchDetail();
    }
  }, [visible, redPacketId, fetchDetail]);

  const handleGrab = async () => {
    if (!redPacketId || grabbing || hasGrabbed) return;

    setGrabbing(true);
    try {
      const response = await chatApi.grabRedPacket(redPacketId);

      const res = response as any;
      if (res.code === 0) {
        setHasGrabbed(true);
        onGrabSuccess?.(response.data);
        // 刷新详情
        fetchDetail();
      } else {
        Alert.alert('提示', res.msg || '抢红包失败');
      }
    } catch (error) {
      console.error('抢红包失败:', error);
      Alert.alert('提示', '抢红包失败，请重试');
    } finally {
      setGrabbing(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 获取用户抢到的金额（支持多种字段名，API返回的是amount）
  const getUserMoney = (receiver: any): number => {
    if (!receiver) return 0;
    return receiver.amount ?? receiver.userMoney ?? receiver.money ?? 0;
  };

  const isLuckyKing = (receiver: any) => {
    if (!detail?.who?.length) return false;
    // 平分红包和专属红包不显示手气王 (1=拼手气, 2=平分)
    if (detail?.type === 'average' || detail?.type === 'specify' || String(detail?.type) === '2') return false;

    const whoList = detail.who || [];
    const maxMoney = Math.max(...whoList.map((w) => getUserMoney(w)));
    if (maxMoney <= 0) return false;

    const firstMaxIndex = whoList.findIndex((w) => getUserMoney(w) === maxMoney);
    const currentIndex = whoList.indexOf(receiver);

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

  const displaySenderName = detail?.info?.userName || senderName || '未知用户';
  const displayAvatar =
    detail?.info?.userAvatarURL48 ||
    senderAvatar ||
    'https://api.yucoder.cn/images/default-avatar.png';
  const displayMsg = detail?.info?.msg || msg || '红包';
  // 已领取数量从领取记录列表中获取
  const displayGot = detail?.who?.length ?? detail?.got ?? detail?.info?.got ?? 0;
  const displayCount = detail?.count ?? detail?.info?.count ?? 0;

  // 判断是否还可以抢
  const canGrab =
    !hasGrabbed &&
    displayGot < displayCount &&
    (detail?.who?.length || 0) < displayCount;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconSymbol name="xmark" size={20} color="#fff" />
            </TouchableOpacity>

            {/* 发送者信息 */}
            <View style={styles.senderInfo}>
              <Image
                source={{ uri: displayAvatar }}
                style={styles.senderAvatar}
              />
              <Text style={styles.senderName}>{displaySenderName}</Text>
              {detail?.type === 'rockPaperScissors' && (
                <View style={styles.gestureTag}>
                  <Text style={styles.gestureText}>
                    {getGestureName(detail.info?.gesture)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.messageText}>{displayMsg}</Text>

            {/* 红包金额或抢红包按钮 */}
            {canGrab ? (
              <TouchableOpacity
                style={[styles.grabButton, grabbing && styles.grabButtonDisabled]}
                onPress={handleGrab}
                disabled={grabbing}
              >
                <Text style={styles.grabButtonText}>
                  {grabbing ? '抢红包中...' : '开'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.amountSection}>
                {hasGrabbed && detail?.who && (
                  <Text style={styles.amountText}>
                    {getUserMoney(detail.who.find((w) => String(w.userId) === String(userInfo?.id)))}
                    <Text style={styles.amountUnit}> 积分</Text>
                  </Text>
                )}
                <Text style={styles.redPacketInfo}>
                  {displayGot}/{displayCount}个红包
                </Text>
              </View>
            )}
          </View>

          {/* 领取列表 */}
          <View style={styles.body}>
            <Text style={[styles.listTitle, { color: theme.text }]}>
              已领取 {displayGot}/{displayCount}
            </Text>

            {loading ? (
              <ActivityIndicator style={styles.loader} color={theme.tint} />
            ) : (
              <ScrollView
                style={styles.receiverList}
                showsVerticalScrollIndicator={false}
              >
                {[...(detail?.who || [])]
                  .sort((a, b) => getUserMoney(b) - getUserMoney(a))
                  .map((receiver, index) => {
                    // 获取头像URL（API返回的是userAvatar）
                    const avatarUrl = receiver.userAvatar || receiver.avatar || '';
                    return (
                  <View key={`${receiver.id || receiver.userId}-${index}`} style={styles.receiverItem}>
                    <Image
                      source={avatarUrl ? { uri: avatarUrl } : { uri: 'https://api.yucoder.cn/images/default-avatar.png' }}
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
                    <Text style={styles.receiverAmount}>
                      {getUserMoney(receiver)} 积分
                    </Text>
                  </View>
                  );
                })}

                {(!detail?.who || detail.who.length === 0) && (
                  <Text style={[styles.emptyText, { color: theme.icon }]}>
                    还没有人领取红包
                  </Text>
                )}
              </ScrollView>
            )}
          </View>

          {/* 底部 */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>
                关闭
              </Text>
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
    backgroundColor: '#FF6B6B',
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
  grabButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  grabButtonDisabled: {
    opacity: 0.6,
  },
  grabButtonText: {
    color: '#FF6B6B',
    fontSize: 24,
    fontWeight: 'bold',
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
    backgroundColor: '#FF6B6B',
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
    color: '#FF6B6B',
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
