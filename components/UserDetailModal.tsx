import { followApi, UserFollowVO } from '@/api/follow';
import { userApi } from '@/api/user';
import type { UserProfileSnapshot } from '@/components/UserInfoCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUser } from '@/contexts/UserContext';
import { mergeUserProfile, normalizeSeedUser, unwrapApiData } from '@/utils/normalizeUser';
import { pickUserAvatar, resolveAvatarUrl, shouldShowMomentsBg } from '@/utils/userAvatar';
import { Image as ExpoImage } from 'expo-image';
import { toast } from '@/utils/toast';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UserDetailModalProps {
  visible: boolean;
  user: UserProfileSnapshot | null;
  onClose: () => void;
  onViewProfile?: (user: UserProfileSnapshot) => void;
}

export default function UserDetailModal({
  visible,
  user,
  onClose,
  onViewProfile,
}: UserDetailModalProps) {
  const router = useRouter();
  const { userInfo: currentUser } = useUser();

  const [displayUser, setDisplayUser] = useState<UserProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followHover, setFollowHover] = useState(false);

  const [followListVisible, setFollowListVisible] = useState(false);
  const [followListType, setFollowListType] = useState<'following' | 'followers'>('following');
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListData, setFollowListData] = useState<UserFollowVO[]>([]);
  const [followListActionLoadingId, setFollowListActionLoadingId] = useState<string | number | null>(
    null,
  );

  const windowWidth = Dimensions.get('window').width;

  const isSelf = (() => {
    if (!currentUser || !displayUser) return false;
    const curId = currentUser.id;
    const targetId = displayUser.id ?? displayUser.userId;
    if (curId != null && targetId != null && String(curId) === String(targetId)) return true;
    return !!(
      currentUser.userName &&
      displayUser.userName &&
      currentUser.userName === displayUser.userName
    );
  })();

  const isAdminViewer = currentUser?.userRole === 'admin';

  useEffect(() => {
    if (!visible || !user) {
      setDisplayUser(null);
      setIsFollowing(false);
      setFollowHover(false);
      return;
    }

    let cancelled = false;

    const loadUserDetail = async () => {
      const seed = normalizeSeedUser(user);
      if (!seed) {
        setDisplayUser(null);
        return;
      }

      setDisplayUser(seed);
      setLoading(true);
      setIsFollowing(false);

      try {
        let merged = { ...seed };
        const initialId = seed.id ?? seed.userId;

        if (initialId != null && initialId !== '') {
          const res = await userApi.getUserVoById(initialId);
          const full = unwrapApiData(res);
          if (full) merged = mergeUserProfile(seed, full);
        } else if (seed.userName) {
          const res = await userApi.getUserProfile(seed.userName);
          const full = unwrapApiData(res);
          if (full) merged = mergeUserProfile(seed, full);
        }

        if (!cancelled) setDisplayUser(merged);

        const targetId = merged.id ?? merged.userId;
        const targetIsSelf = (() => {
          if (!currentUser || !merged) return false;
          const curId = currentUser.id;
          if (curId != null && targetId != null && String(curId) === String(targetId)) return true;
          return !!(
            currentUser.userName &&
            merged.userName &&
            currentUser.userName === merged.userName
          );
        })();

        if (!cancelled && !targetIsSelf && targetId != null && targetId !== '') {
          try {
            const followRes = await followApi.isFollowing(targetId);
            const data = followRes?.data;
            setIsFollowing(!!(data === true || (followRes.code === 0 && data)));
          } catch {
            setIsFollowing(false);
          }
        }
      } catch (error) {
        console.error('加载用户详情失败:', error);
        toast.error('加载用户信息失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUserDetail();
    return () => {
      cancelled = true;
    };
  }, [visible, user]);

  const handleToggleFollow = async () => {
    const id = displayUser?.id ?? displayUser?.userId;
    if (!id || isSelf) return;
    setFollowLoading(true);
    try {
      const res = await followApi.toggleFollow(id);
      const nowFollowing = !!(res?.data ?? res);
      if (res.code === 0 || res.data !== undefined) {
        setIsFollowing(nowFollowing);
        setDisplayUser((prev) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max(
                  0,
                  (Number(prev.followerCount) || 0) + (nowFollowing ? 1 : -1),
                ),
              }
            : prev,
        );
        toast.success(nowFollowing ? '关注成功' : '已取消关注');
      }
    } catch (error: any) {
      toast.error(error?.message || '操作失败');
    } finally {
      setFollowLoading(false);
      setFollowHover(false);
    }
  };

  const openFollowList = async (type: 'following' | 'followers') => {
    if (!isSelf) {
      toast.info('暂时只支持查看自己的关注/粉丝列表');
      return;
    }
    setFollowListType(type);
    setFollowListVisible(true);
    setFollowListLoading(true);
    setFollowListData([]);
    setFollowListActionLoadingId(null);
    try {
      const fn = type === 'following' ? followApi.listMyFollowing : followApi.listMyFollowers;
      const res = await fn({ current: 1, pageSize: 50 });
      if (res?.code === 0 && res.data?.records) {
        setFollowListData(res.data.records);
      }
    } catch (error) {
      console.error('获取关注/粉丝列表失败:', error);
      toast.error('获取列表失败');
    } finally {
      setFollowListLoading(false);
    }
  };

  const handleFollowBack = async (item: UserFollowVO) => {
    if (!item?.userId || item.isMutual) return;
    setFollowListActionLoadingId(item.userId);
    try {
      const res = await followApi.toggleFollow(item.userId);
      const nowFollowing = !!(res?.data ?? res);
      if (!nowFollowing) return;
      setFollowListData((prev) =>
        prev.map((i) => (i.userId === item.userId ? { ...i, isMutual: true } : i)),
      );
      setDisplayUser((prev) =>
        prev
          ? {
              ...prev,
              followingCount: Math.max(0, (Number(prev.followingCount) || 0) + 1),
            }
          : prev,
      );
      toast.success('关注成功');
    } catch (error: any) {
      toast.error(error?.message || '回关失败');
    } finally {
      setFollowListActionLoadingId(null);
    }
  };

  const handleUnfollow = async (item: UserFollowVO) => {
    if (!item?.userId) return;
    setFollowListActionLoadingId(item.userId);
    try {
      const res = await followApi.toggleFollow(item.userId);
      const stillFollowing = !!(res?.data ?? res);
      if (stillFollowing) return;
      setFollowListData((prev) => prev.filter((i) => i.userId !== item.userId));
      setDisplayUser((prev) =>
        prev
          ? {
              ...prev,
              followingCount: Math.max(0, (Number(prev.followingCount) || 0) - 1),
            }
          : prev,
      );
      toast.success('已取消关注');
    } catch (error: any) {
      toast.error(error?.message || '取消关注失败');
    } finally {
      setFollowListActionLoadingId(null);
    }
  };

  const goProfile = () => {
    if (!displayUser) return;
    onClose();
    if (onViewProfile) {
      onViewProfile(displayUser);
    }
  };

  const goFishCircle = () => {
    const id = displayUser?.id ?? displayUser?.userId;
    onClose();
    if (id != null) {
      router.push({
        pathname: '/(tabs)/moments',
        params: { filterUserId: String(id), filterUserName: displayUser?.userName || '' },
      });
    } else {
      router.push('/(tabs)/moments');
    }
  };

  if (!visible) return null;

  const displayName =
    displayUser?.userNickname || displayUser?.userName || displayUser?.name || '未知用户';
  const avatarUrl = pickUserAvatar(displayUser);
  const hasMomentsBg =
    !!displayUser?.momentsBgUrl &&
    shouldShowMomentsBg(displayUser.momentsBgUrl, avatarUrl);
  const wideLayout = hasMomentsBg && windowWidth >= 520;
  const region = displayUser?.region || displayUser?.userCity;
  const regionText = region
    ? displayUser?.country
      ? `${displayUser.country} · ${region}`
      : region
    : '';
  const statusText = (() => {
    if (!displayUser) return '在线';
    if (displayUser.userOnlineFlag === false) return '离线';
    return displayUser.status || '在线';
  })();
  const followingCount = displayUser?.followingCount ?? displayUser?.followingUserCount;
  const points = displayUser?.points ?? displayUser?.userPoint ?? 0;

  const followLabel = isFollowing
    ? followHover
      ? '取消关注'
      : '✓ 已关注'
    : '+ 关注';

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.dialog, wideLayout && styles.dialogWide]}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity style={styles.dialogClose} onPress={onClose} hitSlop={8}>
              <Text style={styles.dialogCloseText}>×</Text>
            </TouchableOpacity>

            {loading && !displayUser ? (
              <ActivityIndicator style={styles.loader} color="#ff8c00" />
            ) : displayUser ? (
              <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={[
                  styles.body,
                  wideLayout && styles.bodyRow,
                ]}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={[styles.left, wideLayout && styles.leftInRow]}>
                  <View style={styles.topRow}>
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: avatarUrl }} style={styles.detailAvatar} />
                      {displayUser.avatarFramerUrl ? (
                        <ExpoImage
                          source={{ uri: resolveAvatarUrl(displayUser.avatarFramerUrl) }}
                          style={styles.avatarFrame}
                          contentFit="contain"
                        />
                      ) : null}
                    </View>
                    <View style={styles.nameBlock}>
                      <View style={styles.nameRow}>
                        <Text style={styles.detailName} numberOfLines={2}>
                          {displayName}
                        </Text>
                        {(displayUser.vip || displayUser.isVip) && (
                          <View style={styles.vipBadge}>
                            <Text style={styles.vipText}>V</Text>
                          </View>
                        )}
                      </View>
                      {!isSelf && (
                        <Pressable
                          onPress={handleToggleFollow}
                          onPressIn={() => isFollowing && setFollowHover(true)}
                          onPressOut={() => setFollowHover(false)}
                          disabled={followLoading}
                          style={[
                            styles.followBtn,
                            isFollowing ? styles.followBtnActive : styles.followBtnDefault,
                            followHover && isFollowing && styles.followBtnHover,
                          ]}
                        >
                          {followLoading ? (
                            <ActivityIndicator size="small" color={isFollowing ? '#888' : '#fff'} />
                          ) : (
                            <Text
                              style={[
                                styles.followBtnText,
                                isFollowing && !followHover && styles.followBtnTextActive,
                                followHover && isFollowing && styles.followBtnTextHover,
                              ]}
                            >
                              {followLabel}
                            </Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <TouchableOpacity
                      style={[styles.statItem, isSelf && styles.statItemClickable]}
                      disabled={!isSelf}
                      onPress={() => openFollowList('following')}
                    >
                      <Text style={styles.statNum}>{followingCount ?? '-'}</Text>
                      <Text style={styles.statLabel}>关注</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <TouchableOpacity
                      style={[styles.statItem, isSelf && styles.statItemClickable]}
                      disabled={!isSelf}
                      onPress={() => openFollowList('followers')}
                    >
                      <Text style={styles.statNum}>{displayUser.followerCount ?? '-'}</Text>
                      <Text style={styles.statLabel}>粉丝</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoBox}>
                    <InfoRow label="等级" value={`Lv.${displayUser.level ?? 0}`} />
                    <InfoRow label="积分" value={String(points)} />
                    {regionText ? <InfoRow label="地区" value={regionText} /> : null}
                    {isAdminViewer ? (
                      <InfoRow label="管理员" value={displayUser.isAdmin ? '是' : '否'} />
                    ) : null}
                    <InfoRow label="上次活跃" value="刚刚" />
                    <InfoRow label="状态" value={statusText} valueColor="#52c41a" />
                    <View style={styles.infoRow}>
                      <Text style={styles.itemLabel}>更多</Text>
                      <View style={styles.moreActions}>
                        <TouchableOpacity style={[styles.moreBtn, styles.moreBtnPet]} onPress={goProfile}>
                          <IconSymbol name="person.fill" size={17} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.moreBtn, styles.moreBtnCircle]}
                          onPress={goFishCircle}
                        >
                          <IconSymbol name="photo.fill" size={17} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {hasMomentsBg && !wideLayout && (
                    <View style={styles.momentsBanner}>
                      <ExpoImage
                        source={{ uri: resolveAvatarUrl(displayUser.momentsBgUrl!) }}
                        style={styles.momentsBannerImg}
                        contentFit="cover"
                      />
                    </View>
                  )}
                </View>

                {hasMomentsBg && wideLayout && (
                  <View style={styles.rightWide}>
                    <ExpoImage
                      source={{ uri: resolveAvatarUrl(displayUser.momentsBgUrl!) }}
                      style={styles.momentsBg}
                      contentFit="cover"
                    />
                  </View>
                )}
              </ScrollView>
            ) : null}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose}>
                <Text style={styles.footerCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={followListVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFollowListVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setFollowListVisible(false)}>
          <Pressable style={styles.followListDialog} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.followListTitle}>
              {followListType === 'following' ? '我的关注' : '我的粉丝'}
            </Text>
            {followListLoading ? (
              <ActivityIndicator style={styles.followListLoader} color="#ff8c00" />
            ) : followListData.length === 0 ? (
              <Text style={styles.followListEmpty}>
                {followListType === 'following' ? '还没有关注任何人' : '还没有粉丝'}
              </Text>
            ) : (
              <ScrollView style={styles.followListScroll}>
                {followListData.map((item) => (
                  <View key={String(item.userId)} style={styles.followListItem}>
                    <View style={styles.followListAvatarWrap}>
                      <Image
                        source={{ uri: resolveAvatarUrl(item.userAvatar) }}
                        style={styles.followListAvatar}
                      />
                      {item.avatarFramerUrl ? (
                        <Image
                          source={{ uri: resolveAvatarUrl(item.avatarFramerUrl) }}
                          style={styles.followListFrame}
                        />
                      ) : null}
                    </View>
                    <View style={styles.followListInfo}>
                      <View style={styles.followListNameRow}>
                        <Text style={styles.followListName} numberOfLines={1}>
                          {item.userName}
                        </Text>
                        {item.isMutual ? <Text style={styles.mutualBadge}>互相关注</Text> : null}
                      </View>
                      {item.userProfile ? (
                        <Text style={styles.followListProfile} numberOfLines={1}>
                          {item.userProfile}
                        </Text>
                      ) : null}
                    </View>
                    {followListType === 'following' ? (
                      <TouchableOpacity
                        style={styles.unfollowBtn}
                        disabled={followListActionLoadingId === item.userId}
                        onPress={() => handleUnfollow(item)}
                      >
                        {followListActionLoadingId === item.userId ? (
                          <ActivityIndicator size="small" color="#888" />
                        ) : (
                          <Text style={styles.unfollowBtnText}>取消关注</Text>
                        )}
                      </TouchableOpacity>
                    ) : followListType === 'followers' && !item.isMutual ? (
                      <TouchableOpacity
                        style={styles.followBackBtn}
                        disabled={followListActionLoadingId === item.userId}
                        onPress={() => handleFollowBack(item)}
                      >
                        {followListActionLoadingId === item.userId ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.followBackBtnText}>回关</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.followListClose}
              onPress={() => setFollowListVisible(false)}
            >
              <Text style={styles.followListCloseText}>关闭</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={[styles.itemValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '90%',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    flexDirection: 'column',
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  dialogWide: {
    maxWidth: 680,
  },
  dialogClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dialogCloseText: {
    fontSize: 20,
    color: '#999',
    lineHeight: 22,
  },
  loader: {
    paddingVertical: 48,
  },
  body: {
    paddingBottom: 4,
  },
  bodyRow: {
    flexDirection: 'row',
    minHeight: 260,
  },
  left: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    minWidth: 0,
    width: '100%',
  },
  leftInRow: {
    flex: 3,
    width: undefined,
  },
  momentsBanner: {
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: '#f5f5f5',
  },
  momentsBannerImg: {
    width: '100%',
    height: '100%',
  },
  rightWide: {
    flex: 7,
    minHeight: 260,
    maxWidth: '58%',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    paddingRight: 28,
    minHeight: 72,
    overflow: 'visible',
  },
  avatarWrap: {
    width: 60,
    height: 60,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  detailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  avatarFrame: {
    position: 'absolute',
    width: 102,
    height: 102,
    top: -21,
    left: -21,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1e',
    flexShrink: 1,
  },
  vipBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: '#faad14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  followBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 88,
    alignItems: 'center',
  },
  followBtnDefault: {
    backgroundColor: '#ff6b00',
  },
  followBtnActive: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  followBtnHover: {
    backgroundColor: '#fff0f0',
    borderColor: '#ffb3b3',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  followBtnTextActive: {
    color: '#888',
  },
  followBtnTextHover: {
    color: '#ff4d4f',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statItemClickable: {
    // visual feedback on press handled by opacity in RN default
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1e',
  },
  statLabel: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#eee',
  },
  infoBox: {
    backgroundColor: '#f7f8fc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef0f6',
    overflow: 'hidden',
  },
  infoBoxFull: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f6',
  },
  itemLabel: {
    width: 60,
    fontSize: 12,
    color: '#aaa',
  },
  itemValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    textAlign: 'right',
  },
  moreActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnPet: {
    backgroundColor: '#f7971e',
  },
  moreBtnCircle: {
    backgroundColor: '#5b86e5',
  },
  momentsBg: {
    width: '100%',
    height: '100%',
    minHeight: 260,
  },
  footer: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerCloseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  footerCloseText: {
    fontSize: 14,
    color: '#595959',
  },
  followListDialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    maxHeight: '70%',
  },
  followListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1e',
    marginBottom: 12,
  },
  followListLoader: {
    paddingVertical: 24,
  },
  followListEmpty: {
    textAlign: 'center',
    color: '#aaa',
    paddingVertical: 24,
    fontSize: 14,
  },
  followListScroll: {
    maxHeight: 360,
  },
  followListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  followListAvatarWrap: {
    width: 42,
    height: 42,
  },
  followListAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eee',
  },
  followListFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 71,
    height: 71,
    marginTop: -35.5,
    marginLeft: -35.5,
  },
  followListInfo: {
    flex: 1,
    minWidth: 0,
  },
  followListNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  followListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1e',
    flexShrink: 1,
  },
  mutualBadge: {
    fontSize: 11,
    color: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  followListProfile: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  unfollowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 72,
    alignItems: 'center',
  },
  unfollowBtnText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  followBackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ff6b00',
    minWidth: 56,
    alignItems: 'center',
  },
  followBackBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  followListClose: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  followListCloseText: {
    fontSize: 14,
    color: '#595959',
  },
});
