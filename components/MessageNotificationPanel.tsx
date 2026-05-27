import { eventRemindApi, SOURCE_TYPE_MOMENTS } from '@/api/eventRemind';
import { BASE_URL } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatEventRemindTime,
  getMessageTagInfo,
  parseImgContent,
  processEventRemindList,
  type ProcessedEventRemind,
} from '@/utils/eventRemind';
import { toast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const PAGE_SIZE = 10;

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function MessageNotificationPanel({
  visible,
  onClose,
  onUnreadCountChange,
}: Props) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const s = styles(theme);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [list, setList] = useState<ProcessedEventRemind[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  const hasMore = list.length < total;

  const syncUnread = useCallback(
    (items: ProcessedEventRemind[]) => {
      const count = items.filter(i => !i.isRead).length;
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    },
    [onUnreadCountChange],
  );

  const fetchList = useCallback(
    async (p: number, reset = false) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await eventRemindApi.listMyPage({ current: p, pageSize: PAGE_SIZE });
        if (res.code === 0 && res.data) {
          const processed = processEventRemindList(res.data.records || []);
          setList(prev => (reset ? processed : [...prev, ...processed]));
          setPage(p);
          setTotal(res.data.total || 0);
          if (reset) syncUnread(processed);
        }
      } catch {
        toast.error('获取消息列表失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [syncUnread],
  );

  useEffect(() => {
    if (!visible) return;
    setDeleteMode(false);
    setSelectedIds([]);
    fetchList(1, true);
  }, [visible, fetchList]);

  const markSingleAsRead = async (id: number) => {
    try {
      const res = await eventRemindApi.batchSetRead([id]);
      if (res.code === 0) {
        setList(prev => {
          const next = prev.map(item => (item.id === id ? { ...item, isRead: true, state: 1 } : item));
          syncUnread(next);
          return next;
        });
      }
    } catch {
      toast.error('标记已读失败');
    }
  };

  const markAllAsRead = async () => {
    const ids = list.filter(i => !i.isRead).map(i => i.id).filter((id): id is number => id != null);
    if (ids.length === 0) {
      toast.info('没有未读消息');
      return;
    }
    try {
      const res = await eventRemindApi.batchSetRead(ids);
      if (res.code === 0) {
        toast.success('已全部标记为已读');
        setList(prev => {
          const next = prev.map(item => ({ ...item, isRead: true, state: 1 }));
          syncUnread(next);
          return next;
        });
      }
    } catch {
      toast.error('标记已读失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      toast.info('请先选择要删除的消息');
      return;
    }
    Alert.alert('确认删除', `确定删除选中的 ${selectedIds.length} 条消息吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const res = await eventRemindApi.batchDelete(selectedIds);
            if (res.code === 0) {
              toast.success('删除成功');
              setDeleteMode(false);
              setSelectedIds([]);
              await fetchList(1, true);
            }
          } catch {
            toast.error('删除失败');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleItemPress = async (item: ProcessedEventRemind) => {
    if (deleteMode) return;
    if (!item.isRead && item.id) {
      await markSingleAsRead(item.id);
    }
    if (item.sourceType === SOURCE_TYPE_MOMENTS && item.sourceId) {
      onClose();
      router.push('/(tabs)/moments');
      return;
    }
    if (item.title === '系统通知' && item.senderUser) {
      toast.info(`${item.senderUser.userName || '用户'} 的系统通知`);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const renderContent = (content: string) => {
    const { isImage, imageUrl, text } = parseImgContent(content);
    if (isImage && imageUrl) {
      return <Image source={{ uri: imageUrl }} style={s.msgImage} resizeMode="cover" />;
    }
    return <Text style={s.msgText}>{text}</Text>;
  };

  const renderItem = ({ item }: { item: ProcessedEventRemind }) => {
    const tag = getMessageTagInfo(item.action);
    const sender = item.senderUser;
    const avatar = sender?.userAvatar || `${BASE_URL}/avatar/default`;
    const checked = item.id != null && selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[s.item, !item.isRead && s.itemUnread]}
        activeOpacity={deleteMode ? 1 : 0.7}
        onPress={() => {
          if (deleteMode && item.id != null) toggleSelect(item.id);
          else handleItemPress(item);
        }}
      >
        {deleteMode && (
          <View style={[s.checkbox, checked && { backgroundColor: theme.tint, borderColor: theme.tint }]}>
            {checked && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </View>
        )}
        <View style={s.itemBody}>
          <View style={s.itemHeader}>
            <Image source={{ uri: avatar }} style={s.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={s.senderName} numberOfLines={1}>
                {sender?.userName || '系统通知'}
              </Text>
              {!item.isRead && <View style={s.unreadDot} />}
            </View>
            <View style={[s.tag, { backgroundColor: tag.color + '18' }]}>
              <Text style={[s.tagText, { color: tag.color }]}>{tag.text}</Text>
            </View>
          </View>
          <Text style={s.itemTitle}>{item.title}</Text>
          {renderContent(item.content || '')}
          <View style={s.itemFooter}>
            <Text style={s.itemTime}>{formatEventRemindTime(item.createTime)}</Text>
            {!deleteMode && !item.isRead && item.id != null && (
              <TouchableOpacity onPress={() => markSingleAsRead(item.id!)}>
                <Text style={[s.markRead, { color: theme.tint }]}>标为已读</Text>
              </TouchableOpacity>
            )}
            {!deleteMode && item.isRead && (
              <Text style={{ color: theme.icon, fontSize: 12 }}>已读</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>🔔 消息通知</Text>
            {unreadCount > 0 && (
              <View style={[s.badge, { backgroundColor: '#ff4d4f' }]}>
                <Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 22, color: theme.icon }}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.toolbar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          {deleteMode ? (
            <>
              <TouchableOpacity
                style={[s.toolBtn, { backgroundColor: '#ff4d4f' }]}
                onPress={handleBatchDelete}
                disabled={deleting || selectedIds.length === 0}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.toolBtnTextDanger}>删除({selectedIds.length})</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toolBtnOutline, { borderColor: theme.border }]}
                onPress={() => {
                  setDeleteMode(false);
                  setSelectedIds([]);
                }}
              >
                <Text style={{ color: theme.text }}>取消</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[s.toolBtnOutline, { borderColor: theme.border }]}
                onPress={() => {
                  setDeleteMode(true);
                  setSelectedIds([]);
                }}
              >
                <Text style={{ color: theme.text }}>删除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toolBtn, { backgroundColor: theme.tint }]}
                onPress={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <Text style={s.toolBtnText}>全部已读</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {loading && list.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator color={theme.tint} size="large" />
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={list.length === 0 ? s.emptyWrap : s.list}
            ListEmptyComponent={<Text style={[s.empty, { color: theme.icon }]}>暂无消息</Text>}
            onEndReached={() => {
              if (!loadingMore && hasMore) fetchList(page + 1, false);
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={theme.tint} style={{ marginVertical: 16 }} />
              ) : list.length > 0 && !hasMore ? (
                <Text style={[s.noMore, { color: theme.icon }]}>没有更多消息了</Text>
              ) : null
            }
          />
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = (theme: typeof Colors['light']) =>
  StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    toolBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    toolBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    toolBtnTextDanger: { color: '#fff', fontWeight: '600', fontSize: 13 },
    toolBtnOutline: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    list: { padding: 12, paddingBottom: 24 },
    emptyWrap: { flexGrow: 1, justifyContent: 'center' },
    empty: { textAlign: 'center', fontSize: 14 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    noMore: { textAlign: 'center', fontSize: 12, marginVertical: 16 },
    item: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      gap: 8,
    },
    itemUnread: {
      borderLeftWidth: 3,
      borderLeftColor: theme.tint,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    itemBody: { flex: 1 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.border },
    senderName: { fontSize: 14, fontWeight: '600', color: theme.text },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.tint,
      marginTop: 4,
    },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    tagText: { fontSize: 11, fontWeight: '600' },
    itemTitle: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 6 },
    msgText: { fontSize: 13, color: theme.text, lineHeight: 20 },
    msgImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 4 },
    itemFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    itemTime: { fontSize: 11, color: theme.icon },
    markRead: { fontSize: 12, fontWeight: '500' },
  });
