import { followApi } from '@/api/follow';
import type { Moment, MomentComment, MomentsLotteryResult } from '@/api/moments';
import { momentsApi } from '@/api/moments';
import { userApi } from '@/api/user';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';
import MomentCard from '@/components/MomentCard';
import MomentLotteryModal from '@/components/MomentLotteryModal';
import MomentPublishModal from '@/components/MomentPublishModal';
import UserDetailModal from '@/components/UserDetailModal';
import type { UserProfileSnapshot } from '@/components/UserInfoCard';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildMomentContextMenuItems } from '@/utils/momentContextMenu';
import { toast } from '@/utils/toast';
import { pickUserAvatar, resolveAvatarUrl } from '@/utils/userAvatar';
import { useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGE_SIZE = 10;

export default function MomentsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo, isLoggedIn } = useUser();
  const meId = String(userInfo?.id ?? '');
  const params = useLocalSearchParams<{ filterUserId?: string; filterUserName?: string }>();
  const appliedRouteFilterRef = useRef<string | null>(null);

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [commentsMap, setCommentsMap] = useState<Record<number, MomentComment[]>>({});
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<{
    anchorId: number;
    parentId: number;
    userName: string;
  } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentImagesMap, setCommentImagesMap] = useState<Record<number, string[]>>({});
  const [commentImageUploadingId, setCommentImageUploadingId] = useState<number | null>(null);
  const [publishVisible, setPublishVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lotteryVisible, setLotteryVisible] = useState(false);
  const [lotteryMomentId, setLotteryMomentId] = useState<number | null>(null);
  const [lotteryWinnerCount, setLotteryWinnerCount] = useState(1);
  const [lotterying, setLotterying] = useState(false);
  const [lotteryResult, setLotteryResult] = useState<MomentsLotteryResult | null>(null);

  const [rewardMomentId, setRewardMomentId] = useState<number | null>(null);
  const [rewardPoints, setRewardPoints] = useState('10');
  const [rewarding, setRewarding] = useState(false);

  const [momentMenu, setMomentMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    moment: null as Moment | null,
    items: [] as ContextMenuItem[],
  });

  const isAdmin = userInfo?.userRole === 'admin';

  // user filter state
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterUserName, setFilterUserName] = useState<string>('');
  const [profileUser, setProfileUser] = useState<UserProfileSnapshot | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);

  const loadComments = useCallback(async (momentId: number) => {
    try {
      const res = await momentsApi.listComments({ momentId, current: 1, pageSize: 50 });
      if (res.code === 0 && res.data?.records) {
        setCommentsMap(prev => ({ ...prev, [momentId]: res.data!.records }));
      }
    } catch {}
  }, []);

  const fetchMoments = useCallback(async (p: number, isRefresh = false, userId?: number) => {
    if (p === 1) { isRefresh ? setRefreshing(true) : setLoading(true); }
    else { setLoadingMore(true); }
    setError(null);
    try {
      const res = await momentsApi.listMoments({
        current: p, pageSize: PAGE_SIZE, sortField: 'createTime', sortOrder: 'descend',
        ...(userId != null ? { userId } : {}),
      });
      if (res.code === 0 && res.data) {
        const records = (res.data.records || []).sort(
          (a, b) => (b.isTop || 0) - (a.isTop || 0),
        );
        setMoments(prev => p === 1 ? records : [...prev, ...records]);
        setPage(p);
        setHasMore(p * PAGE_SIZE < (res.data.total || 0));
        // load comments for each post so they show by default
        records.forEach(m => { if (m.commentNum > 0) loadComments(m.id); });
      } else {
        // non-zero code — stop loading, show empty list
        if (p === 1) setMoments([]);
        setHasMore(false);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || '加载失败');
      if (p === 1) setMoments([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchMoments(1); }, []);

  const loadProfileUser = useCallback(async (userId: number) => {
    setProfileLoading(true);
    setIsFollowing(false);
    try {
      const res = await userApi.getUserVoById(userId);
      if (res.code === 0 && res.data) {
        setProfileUser(res.data as UserProfileSnapshot);
      } else {
        setProfileUser({ id: userId, userName: filterUserName });
      }
      if (isLoggedIn && String(userId) !== meId) {
        const followRes = await followApi.isFollowing(userId);
        const data = followRes?.data;
        setIsFollowing(!!(data === true || (followRes.code === 0 && data)));
      }
    } catch {
      setProfileUser({ id: userId, userName: filterUserName });
    } finally {
      setProfileLoading(false);
    }
  }, [filterUserName, isLoggedIn, meId]);

  useEffect(() => {
    if (filterUserId == null) {
      setProfileUser(null);
      setIsFollowing(false);
      return;
    }
    loadProfileUser(filterUserId);
  }, [filterUserId, loadProfileUser]);

  useEffect(() => {
    const rawId = params.filterUserId;
    if (!rawId || appliedRouteFilterRef.current === rawId) return;
    const userId = Number(rawId);
    if (Number.isNaN(userId)) return;
    appliedRouteFilterRef.current = rawId;
    const userName =
      typeof params.filterUserName === 'string' ? params.filterUserName : '';
    setFilterUserId(userId);
    setFilterUserName(userName);
    setMoments([]);
    setCommentsMap({});
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchMoments(1, false, userId);
  }, [params.filterUserId, params.filterUserName, fetchMoments]);

  const onRefresh = useCallback(() => fetchMoments(1, true, filterUserId ?? undefined), [fetchMoments, filterUserId]);
  const onEndReached = useCallback(() => { if (!loadingMore && hasMore) fetchMoments(page + 1, false, filterUserId ?? undefined); }, [loadingMore, hasMore, page, fetchMoments, filterUserId]);

  const handleAvatarPress = useCallback((userId: number, userName: string) => {
    setFilterUserId(userId);
    setFilterUserName(userName);
    setMoments([]);
    setCommentsMap({});
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchMoments(1, false, userId);
  }, [fetchMoments]);

  const handleToggleFollow = useCallback(async () => {
    if (!filterUserId || !isLoggedIn || String(filterUserId) === meId) return;
    setFollowLoading(true);
    try {
      const res = await followApi.toggleFollow(filterUserId);
      if (res.code === 0) {
        const nowFollowing = !!res.data;
        setIsFollowing(nowFollowing);
        setProfileUser((prev) =>
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
    } catch (e: any) {
      toast.error(e?.message || '操作失败');
    } finally {
      setFollowLoading(false);
    }
  }, [filterUserId, isLoggedIn, meId]);

  const handleBack = useCallback(() => {
    setFilterUserId(null);
    setFilterUserName('');
    setProfileUser(null);
    setIsFollowing(false);
    setMoments([]);
    setCommentsMap({});
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchMoments(1, false, undefined);
  }, [fetchMoments]);

  const handleLike = useCallback(async (m: Moment) => {
    if (!isLoggedIn) { Alert.alert('提示', '请先登录'); return; }
    try {
      const res = await momentsApi.toggleLike({ momentId: m.id });
      if (res.code !== 0) return;
      const name = userInfo?.userName || '';
      const liked = m.liked;
      let names = (m.likeUserNames || '').split(',').filter(Boolean);
      if (liked) names = names.filter(n => n !== name);
      else if (!names.includes(name)) names.push(name);
      setMoments(prev => prev.map(item =>
        item.id === m.id ? { ...item, liked: !liked, likeNum: item.likeNum + (liked ? -1 : 1), likeUserNames: names.join(',') } : item
      ));
    } catch {}
  }, [isLoggedIn, userInfo]);

  const clearCommentDraft = useCallback((momentId?: number) => {
    setCommentInput('');
    setReplyTarget(null);
    if (momentId != null) {
      setCommentImagesMap(prev => {
        const next = { ...prev };
        delete next[momentId];
        return next;
      });
    }
  }, []);

  const handleToggleComment = useCallback((id: number) => {
    if (openCommentId === id) {
      setOpenCommentId(null);
      clearCommentDraft(id);
    } else {
      if (openCommentId != null) clearCommentDraft(openCommentId);
      setOpenCommentId(id);
      setReplyTarget(null);
      if (!commentsMap[id]) loadComments(id);
      setCommentInput('');
    }
  }, [openCommentId, commentsMap, loadComments, clearCommentDraft]);

  const handleReply = useCallback(
    (comment: MomentComment, momentId: number, rootCommentId?: number) => {
      setOpenCommentId(momentId);
      setReplyTarget({
        anchorId: comment.id,
        parentId: rootCommentId ?? comment.id,
        userName: comment.userName,
      });
      setCommentInput('');
    },
    [],
  );

  const handlePickCommentImages = useCallback(
    async (momentId: number) => {
      const current = commentImagesMap[momentId] || [];
      if (current.length >= 3) {
        Alert.alert('提示', '最多添加 3 张图片');
        return;
      }
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('权限请求', '需要访问相册权限才能选择图片');
          return;
        }
        const remaining = 3 - current.length;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 0.8,
          selectionLimit: remaining,
        });
        if (result.canceled || !result.assets?.length) return;

        setCommentImageUploadingId(momentId);
        const uploaded: string[] = [];
        for (const [index, asset] of result.assets.entries()) {
          const ext =
            asset.fileName?.split('.').pop()?.toLowerCase() ||
            asset.mimeType?.split('/').pop() ||
            'jpg';
          const fileName = asset.fileName || `comment_${Date.now()}_${index}.${ext}`;
          const res = await userApi.uploadPostImage(
            asset.uri,
            fileName,
            asset.mimeType || 'image/jpeg',
          );
          if (res.data) uploaded.push(res.data);
        }
        if (uploaded.length === 0) {
          Alert.alert('上传失败', '图片上传失败，请稍后重试');
          return;
        }
        setCommentImagesMap(prev => ({
          ...prev,
          [momentId]: [...(prev[momentId] || []), ...uploaded].slice(0, 3),
        }));
      } catch (e: any) {
        Alert.alert('上传失败', e?.message || '请稍后重试');
      } finally {
        setCommentImageUploadingId(null);
      }
    },
    [commentImagesMap],
  );

  const handleRemoveCommentImage = useCallback((momentId: number, index: number) => {
    setCommentImagesMap(prev => {
      const list = [...(prev[momentId] || [])];
      list.splice(index, 1);
      return { ...prev, [momentId]: list };
    });
  }, []);

  const handleSubmitComment = useCallback(async (momentId: number) => {
    const text = commentInput.trim();
    const images = commentImagesMap[momentId] || [];
    if (!text && !images.length) return;
    if (!isLoggedIn) { Alert.alert('提示', '请先登录'); return; }
    setSubmittingComment(true);
    try {
      const imgPart = images.map(url => `[img:${url}]`).join('');
      const content = text + imgPart;
      const res = await momentsApi.addComment({
        momentId,
        content,
        parentId: replyTarget?.parentId,
      });
      if (res.code !== 0) { Alert.alert('失败', res.message || '评论失败'); return; }
      clearCommentDraft(momentId);
      await loadComments(momentId);
      setMoments(prev => prev.map(m => m.id === momentId ? { ...m, commentNum: m.commentNum + 1 } : m));
    } catch { Alert.alert('失败', '评论失败'); }
    finally { setSubmittingComment(false); }
  }, [commentInput, commentImagesMap, isLoggedIn, replyTarget, loadComments, clearCommentDraft]);

  const handleDeleteComment = useCallback(async (commentId: number, momentId: number) => {
    Alert.alert('确认', '删除这条评论？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try {
          const res = await momentsApi.deleteComment({ id: String(commentId) });
          if (res.code !== 0) return;
          await loadComments(momentId);
          setMoments(prev => prev.map(m => m.id === momentId ? { ...m, commentNum: Math.max(m.commentNum - 1, 0) } : m));
        } catch {}
      }},
    ]);
  }, [loadComments]);

  const handleDeleteMoment = useCallback((id: number) => {
    Alert.alert('确认', '删除这条动态？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try {
          const res = await momentsApi.deleteMoment({ id: String(id) });
          if (res.code !== 0) return;
          setMoments(prev => prev.filter(m => m.id !== id));
        } catch {}
      }},
    ]);
  }, []);

  const handleViewSelf = useCallback(() => {
    if (!userInfo?.id) {
      Alert.alert('提示', '请先登录');
      return;
    }
    handleAvatarPress(Number(userInfo.id), userInfo.userName || '我');
  }, [userInfo, handleAvatarPress]);

  const handleStartLottery = useCallback(async () => {
    if (!lotteryMomentId) return;
    if (!isLoggedIn) {
      Alert.alert('提示', '请先登录');
      return;
    }
    setLotterying(true);
    try {
      const res = await momentsApi.startLottery({
        momentId: lotteryMomentId,
        winnerCount: lotteryWinnerCount,
      });
      if (res.code === 0 && res.data) {
        setLotteryResult(res.data);
        await loadComments(lotteryMomentId);
        setOpenCommentId(lotteryMomentId);
      } else {
        Alert.alert('失败', res.message || '抽奖失败，请确保有足够的点赞用户');
      }
    } catch {
      Alert.alert('失败', '抽奖失败，请确保有足够的点赞用户');
    } finally {
      setLotterying(false);
    }
  }, [lotteryMomentId, lotteryWinnerCount, isLoggedIn, loadComments]);

  const handleReward = useCallback(async () => {
    if (!rewardMomentId) return;
    const pts = parseInt(rewardPoints, 10);
    if (isNaN(pts) || pts <= 0) {
      Alert.alert('提示', '请输入有效积分');
      return;
    }
    setRewarding(true);
    try {
      const res = await momentsApi.rewardMoment({ momentId: rewardMomentId, points: pts });
      if (res.code === 0) {
        Alert.alert('成功', `已打赏 ${pts} 积分`);
        setRewardMomentId(null);
      } else {
        Alert.alert('失败', res.message || '打赏失败');
      }
    } catch {
      Alert.alert('失败', '打赏失败');
    } finally {
      setRewarding(false);
    }
  }, [rewardMomentId, rewardPoints]);

  const openLottery = useCallback((m: Moment) => {
    setLotteryMomentId(m.id);
    setLotteryWinnerCount(1);
    setLotteryResult(null);
    setLotteryVisible(true);
  }, []);

  const openMomentMoreMenu = useCallback(
    (m: Moment, x: number, y: number) => {
      const isOwn = String(m.userId) === meId;
      const items = buildMomentContextMenuItems({
        isOwn,
        isAdmin,
        isTop: m.isTop,
        hasLottery: isOwn,
        hasEdit: isOwn || isAdmin,
      });
      if (items.length === 0) return;
      setMomentMenu({ visible: true, x, y, moment: m, items });
    },
    [meId, isAdmin],
  );

  const closeMomentMenu = useCallback(() => {
    setMomentMenu(prev => ({ ...prev, visible: false, moment: null }));
  }, []);

  const handleToggleTop = useCallback(
    async (m: Moment) => {
      const nextTop = m.isTop === 1 ? 0 : 1;
      try {
        const res = await momentsApi.topMoment({ momentId: m.id, top: nextTop === 1 });
        if (res.code === 0) {
          setMoments(prev =>
            prev
              .map(item => (item.id === m.id ? { ...item, isTop: nextTop } : item))
              .sort((a, b) => (b.isTop || 0) - (a.isTop || 0)),
          );
        } else {
          Alert.alert('失败', res.message || '操作失败');
        }
      } catch {
        Alert.alert('失败', '操作失败');
      }
    },
    [],
  );

  const handleMomentMenuAction = useCallback(
    (key: string) => {
      const m = momentMenu.moment;
      closeMomentMenu();
      if (!m) return;
      switch (key) {
        case 'lottery':
          openLottery(m);
          break;
        case 'top':
          handleToggleTop(m);
          break;
        case 'edit':
          setEditingMoment(m);
          setEditVisible(true);
          break;
        case 'delete':
          Alert.alert('确认删除', '删除后无法恢复，确定要删除这条动态吗？', [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: () => handleDeleteMoment(m.id) },
          ]);
          break;
      }
    },
    [momentMenu.moment, closeMomentMenu, openLottery, handleToggleTop, handleDeleteMoment],
  );

  const handleUpdate = useCallback(
    async (id: number, content: string, uploadedUrls: string[], location: string) => {
      const mediaJson = uploadedUrls.map(u => ({ type: 'image' as const, url: u }));
      const res = await momentsApi.updateMoment({
        id,
        content: content.trim(),
        mediaJson,
        location: location.trim() || undefined,
      });
      if (res.code !== 0) throw new Error(res.message || '修改失败');
      setMoments(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                content: content.trim(),
                mediaJson,
                location: location.trim() || undefined,
              }
            : item,
        ),
      );
      toast.success('修改成功');
    },
    [],
  );

  const handlePublish = useCallback(async (content: string, uploadedUrls: string[], location: string) => {
    const res = await momentsApi.publishMoment({
      content,
      mediaJson: uploadedUrls.map(u => ({ type: 'image' as const, url: u })),
      location: location || undefined,
      visibility: 0,
    });
    if (res.code !== 0) throw new Error(res.message || '发布失败');
    // reset to page 1 and reload
    setPage(1);
    setHasMore(true);
    setMoments([]);
    setRefreshing(true);
    try {
      const r = await momentsApi.listMoments({ current: 1, pageSize: PAGE_SIZE, sortField: 'createTime', sortOrder: 'descend' });
      if (r.code === 0 && r.data) {
        setMoments(r.data.records || []);
        setHasMore(1 * PAGE_SIZE < (r.data.total || 0));
      }
    } finally { setRefreshing(false); }
  }, []);

  const s = screenStyles(theme);

  const viewingOtherUser =
    filterUserId != null && isLoggedIn && String(filterUserId) !== meId;
  const viewingProfile = filterUserId != null;
  const coverDisplayName =
    profileUser?.userName || profileUser?.userNickname || filterUserName || '用户';
  const coverAvatar = pickUserAvatar(profileUser);
  const coverBg = profileUser?.momentsBgUrl
    ? resolveAvatarUrl(profileUser.momentsBgUrl)
    : null;
  const coverFollowingCount =
    profileUser?.followingCount ?? profileUser?.followingUserCount;

  const renderCoverHeader = () => {
    if (!viewingProfile) return null;
    const followLabel = isFollowing ? '✓ 已关注' : '+ 关注';
    return (
      <View style={s.coverWrap}>
        <View style={s.coverBg}>
          {coverBg ? (
            <ExpoImage source={{ uri: coverBg }} style={s.coverBgImg} contentFit="cover" />
          ) : null}
        </View>
        <View style={s.coverUserInfo}>
          <Text style={s.coverUserName}>{coverDisplayName}</Text>
          {viewingOtherUser ? (
            <TouchableOpacity
              style={[
                s.coverFollowBtn,
                isFollowing ? s.coverFollowBtnActive : s.coverFollowBtnDefault,
              ]}
              onPress={handleToggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? '#666' : '#fff'} />
              ) : (
                <Text
                  style={[
                    s.coverFollowBtnText,
                    isFollowing && s.coverFollowBtnTextActive,
                  ]}
                >
                  {followLabel}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
          {profileUser ? (
            <View style={s.coverStats}>
              <Text style={s.coverStatText}>
                <Text style={s.coverStatNum}>{coverFollowingCount ?? '-'}</Text> 关注
              </Text>
              <View style={s.coverStatDivider} />
              <Text style={s.coverStatText}>
                <Text style={s.coverStatNum}>{profileUser.followerCount ?? '-'}</Text> 粉丝
              </Text>
            </View>
          ) : profileLoading ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginBottom: 8 }} />
          ) : null}
          <Pressable
            onPress={() => {
              if (viewingOtherUser && profileUser) setUserDetailVisible(true);
            }}
          >
            <ExpoImage source={{ uri: coverAvatar }} style={s.coverAvatar} contentFit="cover" />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderItem = useCallback(({ item }: { item: Moment }) => (
    <MomentCard
      item={item} meId={meId} isAdmin={isAdmin} theme={theme}
      comments={commentsMap[item.id] || []}
      showInput={openCommentId === item.id}
      onLike={handleLike} onToggleComment={handleToggleComment}
      onReply={handleReply} onDeleteComment={handleDeleteComment}
      onAvatarPress={handleAvatarPress}
      onReward={(m) => { setRewardMomentId(m.id); setRewardPoints('10'); }}
      onOpenMoreMenu={openMomentMoreMenu}
      commentInput={openCommentId === item.id ? commentInput : ''}
      commentImages={openCommentId === item.id ? commentImagesMap[item.id] || [] : []}
      commentImageUploading={commentImageUploadingId === item.id}
      onCommentChange={setCommentInput}
      onPickCommentImages={() => handlePickCommentImages(item.id)}
      onRemoveCommentImage={(ix) => handleRemoveCommentImage(item.id, ix)}
      onSubmitComment={handleSubmitComment}
      replyTarget={openCommentId === item.id ? replyTarget : null}
      submittingComment={submittingComment}
    />
  ), [meId, isAdmin, theme, commentsMap, openCommentId, handleLike, handleToggleComment,
    handleReply, handleDeleteComment, handleDeleteMoment, handleAvatarPress, openMomentMoreMenu,
    commentInput, commentImagesMap, commentImageUploadingId, handlePickCommentImages,
    handleRemoveCommentImage, handleSubmitComment, replyTarget, submittingComment]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {!viewingProfile ? (
        <View style={s.header}>
          <Text style={s.headerTitle}>鱼小圈</Text>
          {isLoggedIn && (
            <TouchableOpacity onPress={handleViewSelf} style={s.myCircleBtn}>
              <Text style={{ color: theme.tint, fontSize: 14, fontWeight: '600' }}>我的</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={s.headerCompact}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Text style={[s.backText, { color: theme.tint }]}>‹ 返回</Text>
          </TouchableOpacity>
        </View>
      )}
      {viewingProfile ? renderCoverHeader() : null}
      {loading && moments.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={theme.tint} size="large" /></View>
      ) : error && moments.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>{error}</Text>
          <TouchableOpacity onPress={() => fetchMoments(1)} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.tint, fontSize: 14 }}>点击重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={s.empty}>还没有动态，快来发布第一条吧~</Text>}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={theme.tint} style={{ margin: 16 }} /> :
            (!hasMore && moments.length > 0 ? <Text style={s.noMore}>—— 没有更多了 ——</Text> : null)
          }
        />
      )}
      {isLoggedIn && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: theme.tint }]}
          onPress={() => {
            setEditingMoment(null);
            setPublishVisible(true);
          }}
        >
          <Text style={s.fabText}>＋</Text>
        </TouchableOpacity>
      )}
      <ContextMenu
        visible={momentMenu.visible}
        x={momentMenu.x}
        y={momentMenu.y}
        items={momentMenu.items}
        onAction={handleMomentMenuAction}
        onClose={closeMomentMenu}
      />
      <MomentPublishModal
        visible={publishVisible}
        mode="publish"
        onClose={() => setPublishVisible(false)}
        onPublish={handlePublish}
        theme={theme}
      />
      <MomentPublishModal
        visible={editVisible}
        mode="edit"
        editingMoment={editingMoment}
        onClose={() => {
          setEditVisible(false);
          setEditingMoment(null);
        }}
        onPublish={handlePublish}
        onUpdate={handleUpdate}
        theme={theme}
      />
      <MomentLotteryModal
        visible={lotteryVisible}
        theme={theme}
        loading={lotterying}
        result={lotteryResult}
        winnerCount={lotteryWinnerCount}
        onWinnerCountChange={setLotteryWinnerCount}
        onClose={() => {
          setLotteryVisible(false);
          setLotteryMomentId(null);
          setLotteryResult(null);
        }}
        onStart={handleStartLottery}
      />
      {rewardMomentId != null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setRewardMomentId(null)}>
          <View style={s.rewardOverlay}>
            <View style={[s.rewardCard, { backgroundColor: theme.card }]}>
              <Text style={[s.rewardTitle, { color: theme.text }]}>🎁 打赏动态</Text>
              <Text style={{ color: theme.icon, fontSize: 13, marginBottom: 12 }}>输入打赏积分数量</Text>
              <TextInput
                style={[s.rewardInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="number-pad"
                value={rewardPoints}
                onChangeText={setRewardPoints}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[10, 50, 100].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[s.rewardPreset, { borderColor: theme.border }]}
                    onPress={() => setRewardPoints(String(v))}
                  >
                    <Text style={{ color: theme.text }}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[s.rewardBtn, { borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setRewardMomentId(null)}
                >
                  <Text style={{ color: theme.text }}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.rewardBtn, { backgroundColor: theme.tint }]}
                  onPress={handleReward}
                  disabled={rewarding}
                >
                  {rewarding ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>确认打赏</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      <UserDetailModal
        visible={userDetailVisible}
        user={profileUser}
        onClose={() => setUserDetailVisible(false)}
      />
    </SafeAreaView>
  );
}

const screenStyles = (theme: typeof Colors['light']) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  myCircleBtn: { marginLeft: 'auto' },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 17, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  coverWrap: {
    height: 200,
    backgroundColor: '#e8e8e8',
    position: 'relative',
    overflow: 'hidden',
  },
  coverBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#d8d8d8',
  },
  coverBgImg: {
    width: '100%',
    height: '100%',
  },
  coverUserInfo: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  coverUserName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 6,
  },
  coverFollowBtn: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  coverFollowBtnDefault: {
    backgroundColor: '#ff8c00',
  },
  coverFollowBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  coverFollowBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  coverFollowBtnTextActive: {
    color: '#666',
  },
  coverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  coverStatText: {
    color: '#fff',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  coverStatNum: {
    fontSize: 15,
    fontWeight: '700',
  },
  coverStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  coverAvatar: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  list: { padding: 12, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: theme.icon, marginTop: 60, fontSize: 14 },
  noMore: { textAlign: 'center', color: theme.icon, fontSize: 12, marginVertical: 16 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 26, lineHeight: 30 },
  rewardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  rewardCard: { borderRadius: 14, padding: 20 },
  rewardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  rewardInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  rewardPreset: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  rewardBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
