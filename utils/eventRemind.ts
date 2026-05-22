import type { EventRemind } from '@/api/eventRemind';

export interface ProcessedEventRemind extends EventRemind {
  isRead: boolean;
  title: string;
  content: string;
}

export function parseImgContent(content: string) {
  const imgRegex = /\[img\](.*?)\[\/img\]/g;
  const match = imgRegex.exec(content);
  if (match?.[1]) {
    return { isImage: true, imageUrl: match[1], text: '' };
  }
  return { isImage: false, imageUrl: '', text: content };
}

export function processEventRemindList(records: EventRemind[] = []): ProcessedEventRemind[] {
  return records.map(record => {
    const isRead = record.state === 1;
    let title = '系统通知';
    if (record.action === 'comment') title = '新评论提醒';
    else if (record.action === 'like') title = '点赞提醒';
    else if (record.action === 'mention') title = '有人提到了你';

    return {
      ...record,
      isRead,
      title,
      content: record.sourceContent || '查看详情',
    };
  });
}

export function getMessageTagInfo(action?: string) {
  switch (action) {
    case 'comment':
      return { color: '#1890ff', text: '评论' };
    case 'like':
      return { color: '#ff4d4f', text: '点赞' };
    case 'mention':
      return { color: '#52c41a', text: '提及' };
    default:
      return { color: '#722ed1', text: '通知' };
  }
}

export function formatEventRemindTime(timeStr?: string): string {
  if (!timeStr) return '';
  const d = new Date(timeStr.replace(/-/g, '/'));
  if (isNaN(d.getTime())) return timeStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function countUnread(records: ProcessedEventRemind[]): number {
  return records.filter(r => !r.isRead).length;
}
