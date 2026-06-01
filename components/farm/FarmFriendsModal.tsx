import type { FarmFriendListVO, FarmStealRecordVO } from '@/api/farm';
import { farmApi } from '@/api/farm';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  formatStealCooldown,
  formatStolenTime,
  isFarmStealRecordUnread,
  getFriendUserId,
  normalizeFarmFriend,
  unwrapFarmFriendList,
} from '@/utils/farmUtils';
import { resolveAvatarUrl } from '@/utils/userAvatar';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export type FriendTab = 'play' | 'wechat' | 'invite' | 'visitor';

const TABS: { key: FriendTab; label: string }[] = [
  { key: 'play', label: '同玩好友' },
  { key: 'wechat', label: '微信好友' },
  { key: 'invite', label: '邀请' },
  { key: 'visitor', label: '访客' },
];

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=farm-friend';
const STEALER_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=farm-stealer';

type SortKey = 'steal' | 'level' | 'name';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'steal', label: '可偷优先' },
  { key: 'level', label: '等级' },
  { key: 'name', label: '昵称' },
];

interface FarmFriendsModalProps {
  visible: boolean;
  initialTab?: FriendTab;
  stolenRecords: FarmStealRecordVO[];
  stolenLoading: boolean;
  markAllStolenReadLoading?: boolean;
  onMarkAllStolenRead?: () => void | Promise<void>;
  myLevel: number;
  myNickname: string;
  myAvatar?: string;
  onClose: () => void;
  onRefreshStolen: () => void;
  visitLoadingId?: string | null;
  onVisitFriend: (friend: FarmFriendListVO) => void | Promise<void>;
}

export default function FarmFriendsModal({
  visible,
  initialTab = 'play',
  stolenRecords,
  stolenLoading,
  markAllStolenReadLoading = false,
  onMarkAllStolenRead,
  myLevel,
  myNickname,
  myAvatar,
  onClose,
  onRefreshStolen,
  visitLoadingId = null,
  onVisitFriend,
}: FarmFriendsModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const listMaxHeight = Math.min(360, Math.round(windowHeight * 0.42));
  const [activeTab, setActiveTab] = useState<FriendTab>(initialTab);
  const [friends, setFriends] = useState<FarmFriendListVO[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('steal');
  const [sortOpen, setSortOpen] = useState(false);
  const unreadStolenCount = useMemo(
    () => stolenRecords.filter(isFarmStealRecordUnread).length,
    [stolenRecords],
  );

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await farmApi.getFriendList();
      const list = unwrapFarmFriendList(res.data);
      if (res.code === 0) {
        setFriends(list.map((item) => normalizeFarmFriend(item)));
      } else {
        toast.error(res.msg || res.message || '加载好友列表失败');
      }
    } catch {
      toast.error('加载好友列表失败');
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      onRefreshStolen();
      if (initialTab === 'play') loadFriends();
    } else {
      setActiveTab('play');
      setSearch('');
      setSortOpen(false);
    }
  }, [visible, initialTab, onRefreshStolen, loadFriends]);

  useEffect(() => {
    if (visible && activeTab === 'visitor') onRefreshStolen();
    if (visible && activeTab === 'play') loadFriends();
  }, [visible, activeTab, onRefreshStolen, loadFriends]);

  const filteredFriends = useMemo(() => {
    const kw = search.trim().toLowerCase();
    let list = [...friends];
    if (kw) {
      list = list.filter((f) => (f.nickname ?? '').toLowerCase().includes(kw));
    }
    list.sort((a, b) => {
      if (sortKey === 'steal') {
        const sa = a.canSteal ? 1 : 0;
        const sb = b.canSteal ? 1 : 0;
        if (sb !== sa) return sb - sa;
        return (b.level ?? 0) - (a.level ?? 0);
      }
      if (sortKey === 'level') return (b.level ?? 0) - (a.level ?? 0);
      return (a.nickname ?? '').localeCompare(b.nickname ?? '', 'zh-CN');
    });
    return list;
  }, [friends, search, sortKey]);

  const handleVisit = async (friend: FarmFriendListVO) => {
    if (getFriendUserId(friend) == null) {
      toast.info('好友信息异常');
      return;
    }
    await onVisitFriend(friend);
  };

  const renderPlayContent = () => (
    <>
      <View style={styles.toolbar}>
        <View style={styles.sortWrap}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOpen((v) => !v)}>
            <Text style={styles.sortBtnText}>
              {SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? '排序'}
            </Text>
            <Text style={styles.sortArrow}>{sortOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {sortOpen ? (
            <View style={styles.sortMenu}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sortMenuItem}
                  onPress={() => {
                    setSortKey(opt.key);
                    setSortOpen(false);
                  }}
                >
                  <Text style={styles.sortMenuText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.searchBox}>
          <IconSymbol name="magnifyingglass" size={14} color="rgba(255,248,232,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索好友"
            placeholderTextColor="rgba(255,248,232,0.55)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={[styles.listWrap, { maxHeight: listMaxHeight }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {friendsLoading ? (
          <ActivityIndicator style={{ paddingVertical: 32 }} color="#fff8e8" />
        ) : filteredFriends.length === 0 ? (
          <Text style={styles.emptyText}>
            {friends.length === 0 ? '暂无互关好友，互相关注后可互访农场' : '没有匹配的好友'}
          </Text>
        ) : (
          filteredFriends.map((friend, index) => {
            const fid = getFriendUserId(friend);
            const cooldown = formatStealCooldown(friend.stealCooldown);
            return (
              <View key={String(fid ?? index)} style={styles.friendItem}>
                <Text style={styles.friendRank}>{index + 1}</Text>
                <Image
                  source={{ uri: resolveAvatarUrl(friend.avatar) || DEFAULT_AVATAR }}
                  style={styles.friendAvatar}
                />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName} numberOfLines={1}>
                    {friend.nickname || '好友'}
                  </Text>
                  <View style={styles.friendMeta}>
                    <Text style={styles.friendLevel}>Lv.{friend.level ?? 1}</Text>
                    {friend.canSteal === true && !cooldown ? (
                      <Text style={styles.canStealIcon}>🥬</Text>
                    ) : cooldown ? (
                      <Text style={styles.cooldownText}>冷却 {cooldown}</Text>
                    ) : (
                      <Text style={styles.cooldownText}>暂不可偷</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.visitBtn, visitLoadingId === fid && styles.visitBtnDisabled]}
                  disabled={visitLoadingId === fid}
                  onPress={() => handleVisit(friend)}
                >
                  <Text style={styles.visitBtnText}>
                    {visitLoadingId === fid ? '拜访中' : '拜访'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );

  const renderVisitorContent = () => (
    <View style={styles.visitorBlock}>
      <View style={styles.visitorHead}>
        <View style={styles.visitorIconWrap}>
          <IconSymbol name="envelope.fill" size={22} color="#c62828" />
        </View>
        <Text style={styles.visitorTitle}>谁偷了我的菜</Text>
        {unreadStolenCount > 0 ? (
          <View style={styles.visitorCount}>
            <Text style={styles.visitorCountText}>{unreadStolenCount}</Text>
          </View>
        ) : null}
        {unreadStolenCount > 0 && onMarkAllStolenRead ? (
          <TouchableOpacity
            style={styles.readAllBtn}
            disabled={markAllStolenReadLoading}
            onPress={() => onMarkAllStolenRead()}
          >
            <Text style={styles.readAllBtnText}>
              {markAllStolenReadLoading ? '处理中...' : '全部已读'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView
        style={[styles.listWrap, { maxHeight: listMaxHeight }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {stolenLoading ? (
          <ActivityIndicator style={{ paddingVertical: 32 }} color="#fff8e8" />
        ) : stolenRecords.length === 0 ? (
          <Text style={styles.emptyText}>暂无偷菜记录</Text>
        ) : (
          stolenRecords.map((record) => (
            <View
              key={String(record.id ?? `${record.stealerId}-${record.stolenTime}`)}
              style={[
                styles.stolenItem,
                isFarmStealRecordUnread(record) && styles.stolenItemUnread,
              ]}
            >
              <Image
                source={{ uri: resolveAvatarUrl(record.stealerAvatar) || STEALER_AVATAR }}
                style={styles.friendAvatar}
              />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName} numberOfLines={1}>
                  {record.stealerNickname || '神秘访客'}
                </Text>
                <Text style={styles.stolenDetail}>
                  偷走了{record.cropName ? `「${record.cropName}」` : '作物'}
                  {record.coinGained != null && record.coinGained > 0
                    ? ` · ${record.coinGained} 积分`
                    : ''}
                </Text>
                {record.stolenTime ? (
                  <Text style={styles.stolenTime}>{formatStolenTime(record.stolenTime)}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderPlaceholder = () => (
    <View style={styles.placeholderWrap}>
      <Text style={styles.emptyText}>功能开发中，敬请期待</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayDismiss} onPress={onClose} accessibilityLabel="关闭" />
        <View style={[styles.panelOuter, { maxHeight: Math.round(windowHeight * 0.88) }]}>
          <LinearGradient colors={['#d4b896', '#b8926a', '#a67c52']} style={styles.panel}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            <Text style={styles.title}>好友</Text>

            <View style={styles.tabs}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.key === 'visitor' && unreadStolenCount > 0 ? (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>
                        {unreadStolenCount > 99 ? '99+' : unreadStolenCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'play'
              ? renderPlayContent()
              : activeTab === 'visitor'
                ? renderVisitorContent()
                : renderPlaceholder()}

            <View style={styles.footer}>
              <View style={styles.selfRow}>
                <Text style={styles.selfRank}>{myLevel}</Text>
                <Image
                  source={{ uri: resolveAvatarUrl(myAvatar) || DEFAULT_AVATAR }}
                  style={styles.selfAvatar}
                />
                <Text style={styles.selfName} numberOfLines={1}>
                  {myNickname}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => toast.info('好友申请功能开发中')}
              >
                <Text style={styles.applyIcon}>+</Text>
                <Text style={styles.applyText}>申请</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 20, 10, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  overlayDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  panelOuter: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#9a7048',
    overflow: 'hidden',
    zIndex: 1,
  },
  panel: {
    borderRadius: 17,
    paddingBottom: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  title: {
    marginTop: 14,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(60, 30, 10, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#6b4423',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#e8c872',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f5e6c8',
  },
  tabTextActive: {
    color: '#5c3d24',
  },
  tabBadge: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    zIndex: 5,
  },
  sortWrap: {
    position: 'relative',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(70, 45, 25, 0.45)',
  },
  sortBtnText: {
    color: '#fff8e8',
    fontSize: 13,
    fontWeight: '600',
  },
  sortArrow: {
    color: '#fff8e8',
    fontSize: 10,
  },
  sortMenu: {
    position: 'absolute',
    top: 36,
    left: 0,
    zIndex: 10,
    minWidth: 120,
    backgroundColor: '#fff8e8',
    borderRadius: 10,
    padding: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sortMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  sortMenuText: {
    fontSize: 13,
    color: '#5c3d24',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(70, 45, 25, 0.45)',
  },
  searchInput: {
    flex: 1,
    color: '#fff8e8',
    fontSize: 13,
    padding: 0,
  },
  listWrap: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#fff8e8',
    fontSize: 14,
    paddingVertical: 32,
    opacity: 0.9,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  friendRank: {
    width: 28,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#5c3d24',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e8c872',
    backgroundColor: '#eee',
  },
  friendInfo: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5c3d24',
  },
  friendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  friendLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d48806',
  },
  canStealIcon: {
    fontSize: 14,
  },
  cooldownText: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  visitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#4caf50',
  },
  visitBtnDisabled: {
    opacity: 0.7,
  },
  visitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  visitorBlock: {
    paddingHorizontal: 12,
  },
  visitorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 8,
  },
  visitorIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff8e8',
    borderWidth: 2,
    borderColor: '#d4a84a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  visitorCount: {
    backgroundColor: '#ff4d4f',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  readAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,232,0.35)',
    backgroundColor: 'rgba(232,200,114,0.28)',
  },
  readAllBtnText: {
    color: '#fff8e8',
    fontSize: 12,
    fontWeight: '700',
  },
  stolenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  stolenItemUnread: {
    borderWidth: 1,
    borderColor: 'rgba(255,193,80,0.55)',
    backgroundColor: 'rgba(130,82,40,0.35)',
  },
  stolenDetail: {
    fontSize: 12,
    color: 'rgba(255,248,232,0.85)',
    marginTop: 2,
  },
  stolenTime: {
    fontSize: 11,
    color: 'rgba(255,248,232,0.65)',
    marginTop: 2,
  },
  placeholderWrap: {
    minHeight: 160,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  selfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  selfRank: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5c3d24',
    backgroundColor: '#fff8e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selfAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e8c872',
  },
  selfName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4caf50',
  },
  applyIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  applyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
