import type { Moment, MomentComment } from '@/api/moments';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BASE_URL } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { extractCommentImages, stripCommentImageMarkers } from '@/utils/fishCircle';
import { formatRelativeTime } from '@/utils/moyuTime';
import { resolveAvatarUrl } from '@/utils/userAvatar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export function getImageUrls(m: Moment): string[] {
  return (m.mediaJson || []).filter(i => i.type === 'image' && i.url).map(i => i.url);
}

function ImageGrid({ urls, borderColor }: { urls: string[]; borderColor: string }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  if (!urls.length) return null;
  const n = urls.length;
  const size = n === 1 ? 200 : n === 2 ? 140 : 90;
  return (
    <>
      <View style={gridStyles.wrap}>
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

const gridStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
});

function ActionPill({
  onPress,
  liked,
  children,
  accent,
}: {
  onPress: () => void;
  liked?: boolean;
  children: React.ReactNode;
  accent?: 'like' | 'comment' | 'reward' | 'more';
}) {
  const bg =
    liked || accent === 'like'
      ? 'rgba(255, 77, 79, 0.08)'
      : accent === 'comment'
        ? undefined
        : accent === 'reward'
          ? undefined
          : undefined;

  return (
    <TouchableOpacity
      style={[actionStyles.pill, bg ? { backgroundColor: bg } : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  count: { fontSize: 13, fontWeight: '500', color: '#8c8c8c' },
});

export type CommentReplyTarget = {
  anchorId: number;
  parentId: number;
  userName: string;
};

function CommentContent({
  content,
  replyUserName,
  theme,
}: {
  content: string;
  replyUserName?: string;
  theme: typeof Colors['light'];
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const text = stripCommentImageMarkers(content);
  const imageUrls = extractCommentImages(content);

  return (
    <>
      {text || replyUserName ? (
        <Text style={[commentStyles.content, { color: theme.text }]}>
          {replyUserName ? (
            <Text>
              <Text style={{ color: theme.tint }}>回复 {replyUserName} </Text>
              {text}
            </Text>
          ) : (
            text
          )}
        </Text>
      ) : null}
      {imageUrls.length > 0 ? (
        <View style={commentStyles.cmtImgRow}>
          {imageUrls.map((url, i) => (
            <TouchableOpacity key={`${url}-${i}`} onPress={() => setPreviewIndex(i)} activeOpacity={0.85}>
              <Image source={{ uri: resolveAvatarUrl(url) }} style={commentStyles.cmtImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {previewIndex !== null ? (
        <ImagePreviewModal
          visible
          images={imageUrls.map(u => resolveAvatarUrl(u))}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChanged={setPreviewIndex}
        />
      ) : null}
    </>
  );
}

function CommentInputArea({
  theme,
  replyTarget,
  commentInput,
  commentImages,
  commentImageUploading,
  onCommentChange,
  onPickImages,
  onRemoveImage,
  onSubmit,
  submittingComment,
  s,
  inline = false,
}: {
  theme: typeof Colors['light'];
  replyTarget: CommentReplyTarget | null;
  commentInput: string;
  commentImages: string[];
  commentImageUploading: boolean;
  onCommentChange: (text: string) => void;
  onPickImages: () => void;
  onRemoveImage: (index: number) => void;
  onSubmit: () => void;
  submittingComment: boolean;
  s: ReturnType<typeof cardStyles>;
  inline?: boolean;
}) {
  const canSubmit = !!(commentInput.trim() || commentImages.length);

  return (
    <View style={[s.inputRow, inline && s.inputRowInline]}>
      {replyTarget ? (
        <Text style={[s.replyHint, { color: theme.icon }]}>回复 {replyTarget.userName}</Text>
      ) : null}
      {commentImages.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.cmtImgPreviewScroll}>
          <View style={s.cmtImgPreviewRow}>
            {commentImages.map((url, i) => (
              <View key={`${url}-${i}`} style={s.cmtImgPreviewWrap}>
                <Image source={{ uri: resolveAvatarUrl(url) }} style={s.cmtImgPreview} />
                <TouchableOpacity style={s.cmtImgRemove} onPress={() => onRemoveImage(i)}>
                  <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}
      <View style={s.inputWrap}>
        <TouchableOpacity
          style={s.cmtImgAddBtn}
          onPress={onPickImages}
          disabled={commentImageUploading || commentImages.length >= 3 || submittingComment}
        >
          {commentImageUploading ? (
            <ActivityIndicator size="small" color={theme.icon} />
          ) : (
            <IconSymbol name="photo" size={20} color={theme.icon} />
          )}
        </TouchableOpacity>
        <TextInput
          style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          value={commentInput}
          onChangeText={onCommentChange}
          placeholder={replyTarget ? `回复 ${replyTarget.userName}...` : '写评论...'}
          placeholderTextColor={theme.icon}
          multiline
          maxLength={200}
          autoFocus
        />
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: theme.tint }, !canSubmit && { opacity: 0.4 }]}
          onPress={onSubmit}
          disabled={!canSubmit || submittingComment || commentImageUploading}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.sendText}>发送</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CommentItem({
  comment,
  meId,
  theme,
  onReply,
  onDelete,
  rootCommentId,
  inputAnchorId,
  renderInputAfter,
  compact,
}: {
  comment: MomentComment;
  meId: string;
  theme: typeof Colors['light'];
  onReply: (c: MomentComment, rootId?: number) => void;
  onDelete: (id: number, momentId: number) => void;
  rootCommentId?: number;
  inputAnchorId: number | 'bottom' | null;
  renderInputAfter: (anchor: number) => React.ReactNode;
  compact?: boolean;
}) {
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const children = comment.children || [];
  const avatarSize = compact ? 22 : 28;

  useEffect(() => {
    if (children.some((ch) => ch.id === inputAnchorId)) {
      setChildrenExpanded(true);
    }
  }, [inputAnchorId, children]);

  return (
    <View style={commentStyles.block}>
      <View style={commentStyles.row}>
        <Image
          source={{ uri: comment.userAvatar || `${BASE_URL}/avatar/default` }}
          style={[
            commentStyles.avatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />
        <View style={commentStyles.body}>
          <Text style={[commentStyles.name, { color: theme.tint }]}>{comment.userName}</Text>
          <CommentContent
            content={comment.content}
            replyUserName={comment.replyUserName}
            theme={theme}
          />
          <View style={commentStyles.meta}>
            <Text style={{ fontSize: 11, color: theme.icon }}>
              {formatRelativeTime(comment.createTime)}
            </Text>
            <TouchableOpacity onPress={() => onReply(comment, rootCommentId)}>
              <Text style={{ fontSize: 11, color: theme.icon }}>回复</Text>
            </TouchableOpacity>
            {String(comment.userId) === meId && (
              <TouchableOpacity onPress={() => onDelete(comment.id, comment.momentId)}>
                <Text style={{ fontSize: 11, color: '#ff4757' }}>删除</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {inputAnchorId === comment.id ? renderInputAfter(comment.id) : null}
      {children.length > 0 && (
        <>
          <TouchableOpacity onPress={() => setChildrenExpanded(e => !e)} style={{ marginTop: 6, marginLeft: compact ? 30 : 36 }}>
            <Text style={{ fontSize: 12, color: theme.tint }}>
              {childrenExpanded ? '收起回复' : `查看 ${children.length} 条回复`}
            </Text>
          </TouchableOpacity>
          {childrenExpanded &&
            children.map(child => (
              <View key={child.id} style={{ marginTop: 10, marginLeft: compact ? 0 : 8 }}>
                <CommentItem
                  comment={child}
                  meId={meId}
                  theme={theme}
                  onReply={onReply}
                  onDelete={onDelete}
                  rootCommentId={comment.id}
                  inputAnchorId={inputAnchorId}
                  renderInputAfter={renderInputAfter}
                  compact
                />
              </View>
            ))}
        </>
      )}
    </View>
  );
}

const commentStyles = StyleSheet.create({
  block: { marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', flexShrink: 0 },
  body: { flex: 1, flexShrink: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  content: { fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cmtImgRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  cmtImg: { width: 72, height: 72, borderRadius: 6, backgroundColor: '#eee' },
});

export interface MomentCardProps {
  item: Moment;
  meId: string;
  isAdmin?: boolean;
  theme: typeof Colors['light'];
  comments: MomentComment[];
  showInput: boolean;
  onLike: (m: Moment) => void;
  onToggleComment: (id: number) => void;
  onReply: (c: MomentComment, momentId: number) => void;
  onDeleteComment: (commentId: number, momentId: number) => void;
  onAvatarPress: (userId: number, userName: string) => void;
  onReward?: (m: Moment) => void;
  onOpenMoreMenu?: (m: Moment, x: number, y: number) => void;
  commentInput: string;
  commentImages: string[];
  commentImageUploading: boolean;
  onCommentChange: (text: string) => void;
  onPickCommentImages: () => void;
  onRemoveCommentImage: (index: number) => void;
  onSubmitComment: (momentId: number) => void;
  replyTarget: CommentReplyTarget | null;
  submittingComment: boolean;
}

export default function MomentCard({
  item,
  meId,
  isAdmin,
  theme,
  comments,
  showInput,
  onLike,
  onToggleComment,
  onReply,
  onDeleteComment,
  onAvatarPress,
  onReward,
  onOpenMoreMenu,
  commentInput,
  commentImages,
  commentImageUploading,
  onCommentChange,
  onPickCommentImages,
  onRemoveCommentImage,
  onSubmitComment,
  replyTarget,
  submittingComment,
}: MomentCardProps) {
  const imgs = getImageUrls(item);
  const isOwn = String(item.userId) === meId;
  const canShowMore = isOwn || isAdmin;
  const s = cardStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const moreBtnRef = useRef<View>(null);

  const COLLAPSE_THRESHOLD = 200;
  const isLongText = (item.content?.length ?? 0) > COLLAPSE_THRESHOLD;

  const openMoreMenu = () => {
    if (!onOpenMoreMenu) return;
    moreBtnRef.current?.measureInWindow((x, y, width, height) => {
      onOpenMoreMenu(item, x + width - 184, y + height + 4);
    });
  };

  const visibleComments = expanded ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3;
  const likeColor = item.liked ? '#ff4d4f' : '#8c8c8c';

  const hasComments = comments.length > 0;

  const inputAnchorId: number | 'bottom' | 'first' | null = showInput
    ? hasComments
      ? replyTarget
        ? replyTarget.anchorId
        : 'bottom'
      : !replyTarget
        ? 'first'
        : null
    : null;

  const renderCommentInput = (anchor: number | 'bottom' | 'first') => {
    if (inputAnchorId !== anchor) return null;
    const input = (
      <CommentInputArea
        theme={theme}
        replyTarget={replyTarget}
        commentInput={commentInput}
        commentImages={commentImages}
        commentImageUploading={commentImageUploading}
        onCommentChange={onCommentChange}
        onPickImages={onPickCommentImages}
        onRemoveImage={onRemoveCommentImage}
        onSubmit={() => onSubmitComment(item.id)}
        submittingComment={submittingComment}
        s={s}
        inline={typeof anchor === 'number'}
      />
    );
    if (anchor === 'first') {
      return (
        <View style={[s.firstCommentWrap, { borderTopColor: theme.border }]}>
          {input}
        </View>
      );
    }
    return input;
  };

  const renderInputAfter = (anchor: number) => renderCommentInput(anchor);

  return (
    <View style={[s.card, item.isTop === 1 && s.cardPinned]}>
      {item.isTop === 1 && (
        <View style={[s.pinBadge, { backgroundColor: theme.tint + '22' }]}>
          <Text style={[s.pinBadgeText, { color: theme.tint }]}>📌 置顶</Text>
        </View>
      )}
      <View style={s.row}>
        <TouchableOpacity
          onPress={() => (String(item.userId) !== meId ? onAvatarPress(item.userId, item.userName) : undefined)}
          activeOpacity={String(item.userId) !== meId ? 0.7 : 1}
        >
          <Image source={{ uri: item.userAvatar || `${BASE_URL}/avatar/default` }} style={s.avatar} />
        </TouchableOpacity>

        <View style={s.body}>
          <TouchableOpacity
            onPress={() => (String(item.userId) !== meId ? onAvatarPress(item.userId, item.userName) : undefined)}
            activeOpacity={String(item.userId) !== meId ? 0.7 : 1}
          >
            <Text style={s.userName}>{item.userName}</Text>
          </TouchableOpacity>

          {!!item.content && (
            <>
              <Text style={s.content} numberOfLines={isLongText && !textExpanded ? 6 : undefined}>
                {item.content}
              </Text>
              {isLongText && (
                <TouchableOpacity onPress={() => setTextExpanded(e => !e)}>
                  <Text style={[s.expandLink, { color: theme.tint }]}>
                    {textExpanded ? '收起' : '展开'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <ImageGrid urls={imgs} borderColor={theme.border} />
          {!!item.location && <Text style={s.location}>📍 {item.location}</Text>}

          {!!item.likeUserNames?.trim() && (
            <View style={[s.likeBar, { backgroundColor: theme.background }]}>
              <Text style={s.likeBarText}>❤️ {item.likeUserNames.split(',').filter(Boolean).join('、')}</Text>
            </View>
          )}

          {/* 底部时间与操作 — 对齐 frontend moment-footer */}
          <View style={[s.footer, { borderTopColor: theme.border }]}>
            <Text style={s.footerTime}>{formatRelativeTime(item.createTime)}</Text>
            <View style={s.footerActions}>
              <ActionPill onPress={() => onLike(item)} liked={item.liked} accent="like">
                <IconSymbol
                  name={item.liked ? 'heart.fill' : 'heart'}
                  size={16}
                  color={likeColor}
                />
                {item.likeNum > 0 && (
                  <Text style={[actionStyles.count, { color: likeColor }]}>{item.likeNum}</Text>
                )}
              </ActionPill>

              <ActionPill onPress={() => onToggleComment(item.id)} accent="comment">
                <IconSymbol name="bubble.left" size={16} color="#8c8c8c" />
                {item.commentNum > 0 && (
                  <Text style={actionStyles.count}>{item.commentNum}</Text>
                )}
              </ActionPill>

              {!isOwn && onReward && (
                <ActionPill onPress={() => onReward(item)} accent="reward">
                  <IconSymbol name="gift.fill" size={16} color="#8c8c8c" />
                </ActionPill>
              )}

              {canShowMore && onOpenMoreMenu && (
                <View ref={moreBtnRef} collapsable={false}>
                  <ActionPill onPress={openMoreMenu} accent="more">
                    <IconSymbol name="ellipsis" size={18} color="#8c8c8c" />
                  </ActionPill>
                </View>
              )}
            </View>
          </View>

          {renderCommentInput('first')}

          {hasComments && (
            <View style={[s.commentSection, { borderTopColor: theme.border }]}>
              {visibleComments.map(c => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  meId={meId}
                  theme={theme}
                  onReply={(comment, rootId) => onReply(comment, item.id, rootId)}
                  onDelete={onDeleteComment}
                  inputAnchorId={inputAnchorId}
                  renderInputAfter={renderInputAfter}
                />
              ))}
              {hasMore && (
                <TouchableOpacity onPress={() => setExpanded(e => !e)}>
                  <Text style={[s.expandText, { color: theme.tint }]}>
                    {expanded ? '收起' : `查看更多 ${comments.length - 3} 条评论`}
                  </Text>
                </TouchableOpacity>
              )}
              {renderCommentInput('bottom')}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const cardStyles = (theme: typeof Colors['light']) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    cardPinned: { borderWidth: 1, borderColor: theme.tint + '55' },
    pinBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginBottom: 6,
    },
    pinBadgeText: { fontSize: 11, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    avatar: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.border, flexShrink: 0 },
    body: { flex: 1, flexShrink: 1, minWidth: 0, overflow: 'hidden' },
    userName: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 4 },
    content: { fontSize: 14, color: theme.text, lineHeight: 22, marginBottom: 4 },
    expandLink: { fontSize: 13, marginBottom: 4 },
    location: { fontSize: 12, color: theme.icon, marginTop: 6 },
    likeBar: { borderRadius: 6, padding: 8, marginTop: 8 },
    likeBarText: { fontSize: 12, color: theme.text },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderStyle: 'dashed',
    },
    footerTime: { fontSize: 13, color: '#999', fontWeight: '400' },
    footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    commentSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    expandText: { fontSize: 12, marginTop: 6 },
    inputRow: { marginTop: 8 },
    inputRowInline: { marginLeft: 36, marginBottom: 4 },
    firstCommentWrap: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    replyHint: { fontSize: 12, marginBottom: 4 },
    inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 13,
      maxHeight: 80,
    },
    sendBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    sendText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    cmtImgPreviewScroll: { marginBottom: 6 },
    cmtImgPreviewRow: { flexDirection: 'row', gap: 8 },
    cmtImgPreviewWrap: { position: 'relative' },
    cmtImgPreview: { width: 56, height: 56, borderRadius: 6, backgroundColor: '#eee' },
    cmtImgRemove: {
      position: 'absolute',
      top: -5,
      right: -5,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cmtImgAddBtn: {
      paddingHorizontal: 6,
      paddingVertical: 8,
      justifyContent: 'center',
    },
  });
