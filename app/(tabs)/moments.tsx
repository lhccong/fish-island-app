import type { Moment, MomentComment } from '@/api/moments';
import { momentsApi } from '@/api/moments';
import MomentCard from '@/components/MomentCard';
import MomentPublishModal from '@/components/MomentPublishModal';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
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

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [commentsMap, setCommentsMap] = useState<Record<number, MomentComment[]>>({});
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<MomentComment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [publishVisible, setPublishVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // user filter state
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterUserName, setFilterUserName] = useState<string>('');

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
        const records = res.data.records || [];
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

  const handleBack = useCallback(() => {
    setFilterUserId(null);
    setFilterUserName('');
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

  const handleToggleComment = useCallback((id: number) => {
    if (openCommentId === id) { setOpenCommentId(null); setReplyTarget(null); }
    else { setOpenCommentId(id); setReplyTarget(null); if (!commentsMap[id]) loadComments(id); }
    setCommentInput('');
  }, [openCommentId, commentsMap, loadComments]);

  const handleReply = useCallback((comment: MomentComment, momentId: number) => {
    setOpenCommentId(momentId); setReplyTarget(comment); setCommentInput('');
  }, []);

  const handleSubmitComment = useCallback(async (momentId: number) => {
    if (!commentInput.trim()) return;
    if (!isLoggedIn) { Alert.alert('提示', '请先登录'); return; }
    setSubmittingComment(true);
    try {
      const res = await momentsApi.addComment({ momentId, content: commentInput.trim(), parentId: replyTarget?.id });
      if (res.code !== 0) { Alert.alert('失败', res.message || '评论失败'); return; }
      setCommentInput(''); setReplyTarget(null);
      await loadComments(momentId);
      setMoments(prev => prev.map(m => m.id === momentId ? { ...m, commentNum: m.commentNum + 1 } : m));
    } catch { Alert.alert('失败', '评论失败'); }
    finally { setSubmittingComment(false); }
  }, [commentInput, isLoggedIn, replyTarget, loadComments]);

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

  const renderItem = useCallback(({ item }: { item: Moment }) => (
    <MomentCard
      item={item} meId={meId} theme={theme}
      comments={commentsMap[item.id] || []}
      showInput={openCommentId === item.id}
      onLike={handleLike} onToggleComment={handleToggleComment}
      onReply={handleReply} onDeleteComment={handleDeleteComment} onDelete={handleDeleteMoment}
      onAvatarPress={handleAvatarPress}
      commentInput={openCommentId === item.id ? commentInput : ''}
      onCommentChange={setCommentInput} onSubmitComment={handleSubmitComment}
      replyTarget={openCommentId === item.id ? replyTarget : null}
      submittingComment={submittingComment}
    />
  ), [meId, theme, commentsMap, openCommentId, handleLike, handleToggleComment,
    handleReply, handleDeleteComment, handleDeleteMoment, commentInput,
    handleSubmitComment, replyTarget, submittingComment]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        {filterUserId != null && (
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Text style={[s.backText, { color: theme.tint }]}>‹ 返回</Text>
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>{filterUserId != null ? filterUserName : '鱼小圈'}</Text>
      </View>
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
        <TouchableOpacity style={[s.fab, { backgroundColor: theme.tint }]} onPress={() => setPublishVisible(true)}>
          <Text style={s.fabText}>＋</Text>
        </TouchableOpacity>
      )}
      <MomentPublishModal visible={publishVisible} onClose={() => setPublishVisible(false)} onPublish={handlePublish} theme={theme} />
    </SafeAreaView>
  );
}

const screenStyles = (theme: typeof Colors['light']) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 17, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
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
});
