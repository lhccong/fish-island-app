import { userApi } from '@/api/user';
import { useUser } from '@/contexts/UserContext';
import {
  isValidLookupUserId,
  mergeUserProfile,
  normalizeSeedUser,
  unwrapApiData,
  userInfoToProfileSnapshot,
} from '@/utils/normalizeUser';
import { pickUserAvatar, resolveAvatarUrl } from '@/utils/userAvatar';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface UserCardTarget {
  userId?: string | number | null;
  userName?: string;
}

export interface UserProfileSnapshot {
  id?: string | number;
  userId?: string | number;
  userName?: string;
  name?: string;
  userNickname?: string;
  userAvatarURL?: string;
  userAvatarURL48?: string;
  userAvatar?: string;
  avatar?: string;
  avatarFramerUrl?: string;
  level?: number;
  points?: number;
  userPoint?: number;
  userOnlineFlag?: boolean;
  status?: string;
  region?: string;
  userCity?: string;
  country?: string;
  vip?: boolean;
  isVip?: boolean;
  momentsBgUrl?: string;
  followerCount?: number;
  followingCount?: number;
  followingUserCount?: number;
  isAdmin?: boolean;
}

interface UserInfoCardProps {
  visible: boolean;
  userId?: string | number | null;
  userName?: string;
  x?: number;
  y?: number;
  onClose: () => void;
  /** 打开完整用户详情页 */
  onDetail?: (user: UserProfileSnapshot) => void;
  onMention?: (userName: string) => void;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 320;
const EDGE_PADDING = 20;

function clampCardPosition(x: number, y: number) {
  const { width, height } = Dimensions.get('window');
  let left = x;
  let top = y;
  if (left + CARD_WIDTH > width - EDGE_PADDING) {
    left = width - CARD_WIDTH - EDGE_PADDING;
  }
  if (top + CARD_HEIGHT > height - EDGE_PADDING) {
    top = height - CARD_HEIGHT - EDGE_PADDING;
  }
  if (left < EDGE_PADDING) left = EDGE_PADDING;
  if (top < EDGE_PADDING) top = EDGE_PADDING;
  return { left, top };
}

export default function UserInfoCard({
  visible,
  userId,
  userName = '',
  x = 0,
  y = 0,
  onClose,
  onDetail,
  onMention,
}: UserInfoCardProps) {
  const { userInfo: currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserProfileSnapshot | null>(null);

  const position = useMemo(() => clampCardPosition(x, y), [x, y]);

  const isCurrentUser =
    Boolean(currentUser?.userName && userName && currentUser.userName === userName) ||
    (currentUser?.id != null &&
      userId != null &&
      isValidLookupUserId(userId) &&
      String(currentUser.id) === String(userId));

  useEffect(() => {
    if (!visible) {
      setUserInfo(null);
      return;
    }

    let cancelled = false;

    const fetchUserInfo = async () => {
      setLoading(true);
      try {
        if (isCurrentUser && currentUser) {
          if (!cancelled) {
            setUserInfo(normalizeSeedUser(userInfoToProfileSnapshot(currentUser)));
          }
          return;
        }

        let data: Record<string, any> | null = null;
        if (isValidLookupUserId(userId)) {
          const res = await userApi.getUserVoById(String(userId).trim());
          data = unwrapApiData(res);
        }
        if (!data && userName) {
          const res = await userApi.getUserProfile(userName);
          data = unwrapApiData(res);
        }
        if (!cancelled) {
          setUserInfo(data ? normalizeSeedUser(data as UserProfileSnapshot) : null);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        if (!cancelled) setUserInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUserInfo();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, userName, isCurrentUser, currentUser]);

  if (!visible) return null;

  const displayName =
    userInfo?.userNickname || userInfo?.userName || userInfo?.name || '未知用户';
  const avatarUrl = pickUserAvatar(userInfo);
  const isOnline = userInfo?.userOnlineFlag !== false;
  const region = userInfo?.region || userInfo?.userCity;
  const regionText = region
    ? userInfo?.country
      ? `${userInfo.country} · ${region}`
      : region
    : '';
  const showMeta =
    userInfo?.level != null || userInfo?.points != null || userInfo?.userPoint != null;

  return (
    <View style={styles.card} pointerEvents="box-none">
      <Pressable
        style={[styles.panel, { top: position.top, left: position.left }]}
        onPress={() => {}}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#ffa940" />
        ) : userInfo ? (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                {userInfo.avatarFramerUrl ? (
                  <ExpoImage
                    source={{ uri: resolveAvatarUrl(userInfo.avatarFramerUrl) }}
                    style={styles.avatarFrame}
                    contentFit="contain"
                  />
                ) : null}
              </View>
              <View style={styles.basic}>
                <Text style={styles.nickname} numberOfLines={1}>
                  {displayName}
                </Text>
                {userInfo.userName ? (
                  <Text style={styles.username} numberOfLines={1}>
                    @{userInfo.userName}
                  </Text>
                ) : null}
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
                  <Text style={styles.statusText}>{isOnline ? '在线' : '离线'}</Text>
                </View>
              </View>
            </View>

            {showMeta && (
              <View style={styles.metaRow}>
                <View style={styles.levelChip}>
                  <Text style={styles.levelText}>Lv.{userInfo.level ?? 0}</Text>
                </View>
                {(userInfo.points != null || userInfo.userPoint != null) && (
                  <Text style={styles.pointsText}>
                    ✨ {userInfo.points ?? userInfo.userPoint ?? 0}
                  </Text>
                )}
              </View>
            )}

            {regionText ? (
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {regionText}
                </Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              {onDetail ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.detailBtn]}
                  onPress={() => onDetail(userInfo)}
                >
                  <Text style={styles.detailBtnText}>查看详情</Text>
                </TouchableOpacity>
              ) : null}
              {!isCurrentUser && userInfo.userName && onMention ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.mentionBtn, !onDetail && styles.actionBtnFull]}
                  onPress={() => {
                    onMention(userInfo.userName!);
                    onClose();
                  }}
                >
                  <Text style={styles.mentionText}>@TA</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.empty}>加载失败</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
  },
  panel: {
    position: 'absolute',
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeText: {
    fontSize: 18,
    color: '#bfbfbf',
  },
  loader: {
    paddingVertical: 32,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingRight: 20,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    backgroundColor: '#eee',
  },
  avatarFrame: {
    position: 'absolute',
    width: 88,
    height: 88,
    top: -18,
    left: -18,
  },
  basic: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nickname: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1c1e',
  },
  username: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d9d9d9',
  },
  statusDotOnline: {
    backgroundColor: '#52c41a',
  },
  statusText: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  levelChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4facfe',
  },
  pointsText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#8c8c8c',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  actionBtnFull: {
    flex: 1,
  },
  detailBtn: {
    backgroundColor: 'rgba(24, 144, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(24, 144, 255, 0.35)',
  },
  detailBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
  },
  mentionBtn: {
    backgroundColor: '#ff9f1a',
  },
  mentionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1e',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
    color: '#bfbfbf',
    fontSize: 14,
  },
});
