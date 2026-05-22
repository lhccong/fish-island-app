import type { ContextMenuItem } from '@/components/ContextMenu';

export function buildMomentContextMenuItems(options: {
  isOwn: boolean;
  isAdmin?: boolean;
  isTop?: number;
  hasLottery?: boolean;
  hasEdit?: boolean;
}): ContextMenuItem[] {
  const { isOwn, isAdmin, isTop, hasLottery, hasEdit } = options;
  const items: ContextMenuItem[] = [];

  if (isOwn && hasLottery) {
    items.push({ key: 'lottery', label: '发起抽奖', icon: 'trophy.fill' });
  }
  if (isAdmin) {
    items.push({
      key: 'top',
      label: isTop === 1 ? '取消置顶' : '置顶动态',
      icon: 'pin.fill',
    });
  }
  if (hasEdit && (isOwn || isAdmin)) {
    items.push({ key: 'edit', label: '修改', icon: 'pencil' });
  }
  if (isOwn || isAdmin) {
    if (items.length > 0) {
      items.push({ key: 'divider-1', label: '', divider: true });
    }
    items.push({ key: 'delete', label: '删除', icon: 'trash', destructive: true });
  }

  return items;
}
