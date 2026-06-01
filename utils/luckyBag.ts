export const LUCKY_BAG_IMAGE = 'https://oss.cqbo.com/moyu/fudai.jpg';
export const LUCKY_BAG_TAG_REGEX = /\[luckybag\]([^\[\]]*)\[\/luckybag\]/i;

export function isLuckyBagContent(content?: string): boolean {
  if (!content) return false;
  return LUCKY_BAG_TAG_REGEX.test(content);
}

export function parseLuckyBagInline(content?: string): { prefix: string; luckyBagId: string } | null {
  if (!content) return null;
  const match = LUCKY_BAG_TAG_REGEX.exec(content);
  if (!match) return null;
  const prefix = content.replace(match[0], '').trim();
  return { prefix, luckyBagId: match[1] };
}

export function getLuckyBagStatusText(status?: number): string {
  if (status === 2) return '已过期';
  if (status === 3) return '已开奖';
  return '进行中';
}

export function isLuckyBagJoinDisabled(detail?: {
  status?: number;
  joined?: boolean;
}): boolean {
  if (!detail) return true;
  if (detail.status === 2 || detail.status === 3) return true;
  if (detail.joined) return true;
  return false;
}

export function formatLuckyBagDateTime(time?: string): string {
  if (!time) return '-';
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleString();
}

export function getLuckyBagDrawTime(detail?: { drawTime?: string; expireTime?: string }): string {
  return formatLuckyBagDateTime(detail?.drawTime || detail?.expireTime);
}

export function getLuckyBagTypeLabel(type?: number): string {
  return type === 2 ? '平均分配' : '随机分配';
}
