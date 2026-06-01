import { ChatMessage } from '@/api/chat';
import { ContextMenuItem } from '@/components/ContextMenu';

const isImageHtml = (content?: string) => /<img[^>]+src=/i.test(content || '');

import { isLuckyBagContent } from '@/utils/luckyBag';

const isRedPacketMessage = (content?: string) => {
  if (!content) return false;
  if (/\[redpacket\]\s*[\s\S]*?\s*\[\/redpacket\]/i.test(content)) return true;
  try {
    const parsed = JSON.parse(content);
    return parsed.msgType === 'redPacket';
  } catch {
    return false;
  }
};

const isSpecialMessage = (content?: string) => {
  if (!content) return false;
  if (isRedPacketMessage(content)) return true;
  if (isLuckyBagContent(content)) return true;
  if (/\[weather\]/i.test(content) || /\[music\]/i.test(content)) return true;
  return false;
};

export const canRevokeMessage = (
  item: ChatMessage,
  currentUserName?: string,
  isAdmin?: boolean,
) => {
  if (item.revoked) return false;
  const isSelf = item.userName === currentUserName;
  return Boolean(isAdmin || isSelf);
};

export const buildMessageContextMenuItems = (
  item: ChatMessage,
  currentUserName?: string,
  isAdmin?: boolean,
): ContextMenuItem[] => {
  const content = item.content || item.md || '';
  if (isSpecialMessage(content)) {
    return [];
  }

  const isSelf = item.userName === currentUserName;
  const isImage = isImageHtml(content) || /\[img\]/i.test(content);
  const viewCardItem: ContextMenuItem[] = isSelf
    ? []
    : [{ key: 'view-card', label: '查看详情', icon: 'person.text.rectangle' }];

  if (isImage) {
    return [
      ...viewCardItem,
      ...(viewCardItem.length ? [{ key: 'divider-view', label: '', divider: true }] : []),
      { key: 'quote', label: '引用', icon: 'quote.bubble.fill' },
      { key: 'add-emoji', label: '添加到表情', icon: 'face.smiling' },
      { key: 'copy-image', label: '复制', icon: 'doc.on.doc' },
      ...(isSelf ? [] : [{ key: 'at', label: '@TA', icon: 'at' }]),
      { key: 'repeat', label: '复读机', icon: 'arrow.clockwise' },
      ...(canRevokeMessage(item, currentUserName, isAdmin)
        ? [{ key: 'revoke', label: '撤回', icon: 'arrow.uturn.backward' }]
        : []),
      ...(isSelf
        ? []
        : [
            { key: 'divider-1', label: '', divider: true },
            { key: 'remark', label: '修改备注', icon: 'pencil' },
          ]),
      { key: 'blacklist', label: '加入黑名单', icon: 'person.slash.fill', destructive: true },
    ];
  }

  return [
    ...viewCardItem,
    ...(viewCardItem.length ? [{ key: 'divider-view', label: '', divider: true }] : []),
    { key: 'copy', label: '复制', icon: 'doc.on.doc' },
    { key: 'quote', label: '引用', icon: 'quote.bubble.fill' },
    ...(isSelf ? [] : [{ key: 'at', label: '@TA', icon: 'at' }]),
    { key: 'repeat', label: '复读机', icon: 'arrow.clockwise' },
    ...(canRevokeMessage(item, currentUserName, isAdmin)
      ? [{ key: 'revoke', label: '撤回', icon: 'arrow.uturn.backward' }]
      : []),
    ...(isSelf
      ? []
      : [
          { key: 'divider-1', label: '', divider: true },
          { key: 'remark', label: '修改备注', icon: 'pencil' },
        ]),
    { key: 'blacklist', label: '加入黑名单', icon: 'person.slash.fill', destructive: true },
  ];
};

export const buildUserContextMenuItems = (): ContextMenuItem[] => [
  { key: 'view-card', label: '查看详情', icon: 'person.text.rectangle' },
  { key: 'divider-0', label: '', divider: true },
  { key: 'at', label: '@TA', icon: 'at' },
  { key: 'divider-1', label: '', divider: true },
  { key: 'remark', label: '修改备注', icon: 'pencil' },
  { key: 'divider-2', label: '', divider: true },
  { key: 'blacklist', label: '加入黑名单', icon: 'person.slash.fill', destructive: true },
];

export const stripHtml = (content: string) =>
  content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export const extractImageUrl = (content: string) => {
  const imgTagMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgTagMatch?.[1]) return imgTagMatch[1];
  const blockMatch = content.match(/\[img\]\s*([\s\S]*?)\s*\[\/img\]/i);
  return blockMatch?.[1]?.trim() || '';
};
