import { ChatMessage } from '@/api/chat';

export type RedPacketParsed = {
  msgType: 'redPacket';
  redPacketId: string;
  msg: string;
  money: number;
  count: number;
  got: number;
  type: string;
  detail?: RedPacketApiDetail;
};

export type RedPacketApiDetail = {
  id?: string;
  name?: string;
  totalAmount?: number;
  count?: number;
  remainingCount?: number;
  got?: number;
  status?: number;
  type?: number | string;
};

export const isRedPacketContent = (content?: string): boolean => {
  if (!content) return false;
  if (/\[redpacket\]\s*[\s\S]*?\s*\[\/redpacket\]/i.test(content)) {
    return true;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed.msgType === 'redPacket';
  } catch {
    return false;
  }
};

export const parseRedPacketContent = (content?: string): RedPacketParsed | null => {
  if (!content || typeof content !== 'string') return null;

  const redPacketMatch = content.match(/\[redpacket\]\s*([\s\S]*?)\s*\[\/redpacket\]/i);
  if (redPacketMatch) {
    const inner = String(redPacketMatch[1] || '').trim();
    try {
      const parsed = JSON.parse(inner);
      if (parsed.msgType === 'redPacket') {
        return normalizeRedPacket(parsed);
      }
    } catch {
      return {
        msgType: 'redPacket',
        redPacketId: inner,
        msg: '红包',
        money: 0,
        count: 0,
        got: 0,
        type: 'random',
      };
    }
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed.msgType === 'redPacket') {
      return normalizeRedPacket(parsed);
    }
  } catch {
    return null;
  }

  return null;
};

const normalizeRedPacket = (parsed: any): RedPacketParsed => ({
  msgType: 'redPacket',
  redPacketId: String(parsed.redPacketId || parsed.id || ''),
  msg: parsed.msg || parsed.name || '红包',
  money: Number(parsed.money ?? parsed.totalAmount ?? 0),
  count: Number(parsed.count ?? 0),
  got: Number(parsed.got ?? 0),
  type: normalizeRedPacketType(parsed.type),
  detail: parsed.detail,
});

export const normalizeRedPacketType = (type?: number | string) => {
  if (type === 1 || type === '1') return 'random';
  if (type === 2 || type === '2') return 'average';
  if (type === 3 || type === '3') return 'specify';
  if (type === 4 || type === '4') return 'heartbeat';
  if (type === 5 || type === '5') return 'rockPaperScissors';
  return String(type || 'random');
};

export const redPacketTypeToApi = (type: string) => {
  const map: Record<string, number> = {
    random: 1,
    average: 2,
    specify: 3,
    heartbeat: 4,
    rockPaperScissors: 5,
  };
  return map[type] || 1;
};

export const getRedPacketDisplayName = (
  parsed: RedPacketParsed | null,
  detail?: RedPacketApiDetail | null,
) => detail?.name || parsed?.msg || '红包';

export const getRedPacketTotalAmount = (
  parsed: RedPacketParsed | null,
  detail?: RedPacketApiDetail | null,
) => detail?.totalAmount ?? parsed?.money ?? 0;

export const getRedPacketTotalCount = (
  parsed: RedPacketParsed | null,
  detail?: RedPacketApiDetail | null,
) => detail?.count ?? parsed?.count ?? 0;

export const getRedPacketRemainingCount = (
  parsed: RedPacketParsed | null,
  detail?: RedPacketApiDetail | null,
) => {
  if (detail && typeof detail.remainingCount === 'number') {
    return detail.remainingCount;
  }
  if (parsed?.detail && typeof parsed.detail.remainingCount === 'number') {
    return parsed.detail.remainingCount;
  }
  return Math.max(0, (parsed?.count || 0) - (parsed?.got || 0));
};

export const isRedPacketFinished = (
  parsed: RedPacketParsed | null,
  detail?: RedPacketApiDetail | null,
) => {
  if (detail) {
    return detail.remainingCount === 0 || (detail.status != null && detail.status !== 0);
  }
  if (parsed?.detail) {
    return parsed.detail.remainingCount === 0 || (parsed.detail.status != null && parsed.detail.status !== 0);
  }
  return (parsed?.got || 0) >= (parsed?.count || 0) && (parsed?.count || 0) > 0;
};

export const buildRedPacketSenderInfo = (message: ChatMessage) => ({
  userName: message.userNickname || message.userName || '未知用户',
  userAvatarURL48:
    message.userAvatarURL48 ||
    message.userAvatarURL ||
    'https://api.yucoder.cn/images/default-avatar.png',
  msg: parseRedPacketContent(message.content || message.md)?.msg || '红包',
});
