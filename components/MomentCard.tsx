/* eslint-disable react-native/no-inline-styles */
import type { Moment, MomentComment } from '@/api/moments';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { BASE_URL } from '@/constants/api';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const t = new Date(timeStr.replace(/-/g, '/'));
  if (isNaN(t.getTime())) return '';
  const now = Date.now();
  const diffMin = Math.floor((now - t.getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffH < 24) return `${diffH}小时前`;
  if (diffD === 1) return '昨天';
  if (diffD < 7) return `${diffD}天前`;
  return `${t.getMonth() + 1}月${t.getDate()}日`;
}

export function getImageUrls(m: Moment): string[] {
  return (m.mediaJson || []).filter(i => i.type === 'image' && i.url).map(i => i.url);
}

function ImageGrid({ urls, borderColor }: { urls: string[]; borderColor: string }) {
  if (!urls.length) return null;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const n = urls.length;
  const size = n === 1 ? 200 : n === 2 ? 140 : 90;
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {urls.slice(0, 9).map((url, i) => (
          <TouchableOpacity key={i} onPress={() => setPreviewIndex(i)} activeOpacity={0.85}>
            <Image
              source={{ uri: url }}
              style={{ width: size, height: size, borderRadius: 6, backgroundColor: borderColor }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </View>
      {previewIndex !== null && (
        <ImagePreviewModal
          visible
          images={urls}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChanged={setPreviewIndex}
        />
      )}
    </>
  );
}

function CommentItem({
  comment,
  meId,
  theme,
  onReply,
  onDelete,
}: {
  comment: MomentComment;
  meId: string;
  theme: typeof Colors['light'];
  onReply: (c: MomentComment) => void;
  onDelete: (id: number, momentId: number) => void;
}) {
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const children = comment.children || [];

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
      <Image
        source={{ uri: comment.userAvatar || `${BASE_URL}/avatar/default` }}
        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', flexShrink: 0 }}
      />
      <View style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.tint, marginBottom: 2 }}>
          {comment.userName}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text, lineHeight: 18 }}>
          {comment.replyUserName
            ? <Text><Text style={{ color: theme.tint }}>回复 {comment.replyUserName} </Text>{comment.content}</Text>
            : comment.content}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: theme.icon }}>{formatTime(comment.createTime)}</Text>
          <TouchableOpacity onPress={() => onReply(comment)}>
            <Text style={{ fontSize: 11, color: theme.icon }}>回复</Text>
          </TouchableOpacity>
          {String(comment.userId) === meId && (
            <TouchableOpacity onPress={() => onDelete(comment.id, comment.momentId)}>
              <Text style={{ fontSize: 11, color: '#ff4757' }}>删除</Text>
            </TouchableOpacity>
          )}
        </View>
        {children.length > 0 && (
          <>
            <TouchableOpacity onPress={() => setChildrenExpanded(e => !e)} style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: theme.tint }}>
                {childrenExpanded ? '收起回复' : `查看 ${children.length} 条回复`}
              </Text>
            </TouchableOpacity>
            {childrenExpanded && children.map(child => (
              <View key={child.id} style={{ marginTop: 10 }}>
                <CommentItem comment={child} meId={meId} theme={theme} onReply={onReply} onDelete={onDelete} />
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

export interface MomentCardProps {
  item: Moment;
  meId: string;
  theme: typeof Colors['light'];
  comments: MomentComment[];
  showInput: boolean;
  onLike: (m: Moment) => void;
  onToggleComment: (id: number) => void;
  onReply: (c: MomentComment, momentId: number) => void;
  onDeleteComment: (commentId: number, momentId: number) => void;
  onDelete: (id: number) => void;
  onAvatarPress: (userId: number, userName: string) => void;
  commentInput: string;
  onCommentChange: (text: string) => void;
  onSubmitComment: (momentId: number) => void;
  replyTarget: MomentComment | null;
  submittingComment: boolean;
}

export default function MomentCard({
  item, meId, theme, comments, showInput,
  onLike, onToggleComment, onReply, onDeleteComment, onDelete, onAvatarPress,
  commentInput, onCommentChange, onSubmitComment, replyTarget, submittingComment,
}: MomentCardProps) {
  const imgs = getImageUrls(item);
  const isOwn = String(item.userId) === meId;
  const s = cardStyles(theme);
  const [expanded, setExpanded] = useState(false);

  const visibleComments = expanded ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3;

  return (
    <View style={s.card}>
      <View style={s.row}>
        {/* Left: avatar */}
        <TouchableOpacity
          onPress={() => String(item.userId) !== meId ? onAvatarPress(item.userId, item.userName) : undefined}
          activeOpacity={String(item.userId) !== meId ? 0.7 : 1}
        >
          <Image source={{ uri: item.userAvatar || `${BASE_URL}/avatar/default` }} style={s.avatar} />
        </TouchableOpacity>

        {/* Right: everything aligned under the name */}
        <View style={s.body}>
          <View style={s.nameRow}>
            <TouchableOpacity
              onPress={() => String(item.userId) !== meId ? onAvatarPress(item.userId, item.userName) : undefined}
              activeOpacity={String(item.userId) !== meId ? 0.7 : 1}
            >
              <Text style={s.userName}>{item.userName}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.time}>{formatTime(item.createTime)}</Text>
              {isOwn && (
                <TouchableOpacity onPress={() => onDelete(item.id)}>
                  <Text style={s.moreBtn}>···</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!!item.content && <Text style={s.content}>{item.content}</Text>}
          <ImageGrid urls={imgs} borderColor={theme.border} />
          {!!item.location && <Text style={s.location}>📍 {item.location}</Text>}

          {!!item.likeUserNames?.trim() && (
            <View style={s.likeBar}>
              <Text style={s.likeBarText}>❤️ {item.likeUserNames.split(',').filter(Boolean).join('、')}</Text>
            </View>
          )}

          <View style={s.actions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => onLike(item)}>
              <Text style={[s.actionText, item.liked && { color: '#ff6b81' }]}>
                {item.liked ? '❤️' : '🤍'}{item.likeNum > 0 ? ` ${item.likeNum}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => onToggleComment(item.id)}>
              <Text style={s.actionText}>💬{item.commentNum > 0 ? ` ${item.commentNum}` : ''}</Text>
            </TouchableOpacity>
          </View>

          {comments.length > 0 && (
            <View style={s.commentSection}>
              {visibleComments.map(c => (
                <CommentItem key={c.id} comment={c} meId={meId} theme={theme}
                  onReply={comment => onReply(comment, item.id)} onDelete={onDeleteComment} />
              ))}
              {hasMore && (
                <TouchableOpacity onPress={() => setExpanded(e => !e)}>
                  <Text style={s.expandText}>
                    {expanded ? '收起' : `查看更多 ${comments.length - 3} 条评论`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showInput && (
            <View style={s.inputRow}>
              {replyTarget && <Text style={s.replyHint}>回复 {replyTarget.userName}</Text>}
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={commentInput}
                  onChangeText={onCommentChange}
                  placeholder={replyTarget ? `回复 ${replyTarget.userName}...` : '写评论...'}
                  placeholderTextColor={theme.icon}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[s.sendBtn, !commentInput.trim() && { opacity: 0.4 }]}
                  onPress={() => onSubmitComment(item.id)}
                  disabled={!commentInput.trim() || submittingComment}
                >
                  {submittingComment
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.sendText}>发送</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const cardStyles = (theme: typeof Colors['light']) => StyleSheet.create({
  card: {
    backgroundColor: theme.card, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { width: 42, height: 42, borderRadius: 8, backgroundColor: theme.border, flexShrink: 0 },
  body: { flex: 1, flexShrink: 1, minWidth: 0, overflow: 'hidden' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 14, fontWeight: '600', color: theme.text },
  time: { fontSize: 11, color: theme.icon },
  moreBtn: { fontSize: 20, color: theme.icon, paddingHorizontal: 4 },
  content: { fontSize: 14, color: theme.text, lineHeight: 22, marginBottom: 4 },
  location: { fontSize: 12, color: theme.icon, marginTop: 6 },
  likeBar: { backgroundColor: theme.background, borderRadius: 6, padding: 8, marginTop: 8 },
  likeBarText: { fontSize: 12, color: theme.text },
  actions: {
    flexDirection: 'row', gap: 16, marginTop: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: theme.icon },
  commentSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
  expandText: { fontSize: 12, color: theme.tint, marginTop: 6 },
  inputRow: { marginTop: 8 },
  replyHint: { fontSize: 12, color: theme.icon, marginBottom: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: theme.text,
    backgroundColor: theme.background, maxHeight: 80,
  },
  sendBtn: { backgroundColor: theme.tint, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  sendText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
