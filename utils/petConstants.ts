export const PET_CENTER_TABS = [
  { key: 'pet', label: '我的宠物', icon: '🏠' },
  { key: 'ranking', label: '排行榜', icon: '🏆' },
  { key: 'boss', label: '摸鱼BOSS', icon: '⚡' },
  { key: 'gallery', label: '图鉴', icon: '📚' },
  { key: 'lottery', label: '抽奖', icon: '🎁' },
] as const;

export type PetCenterTabKey = (typeof PET_CENTER_TABS)[number]['key'];

export const LEFT_EQUIP_SLOTS = [
  { key: 'weapon', label: '武器', icon: '⚔️' },
  { key: 'hand', label: '手套', icon: '🧤' },
  { key: 'foot', label: '鞋子', icon: '👟' },
] as const;

export const RIGHT_EQUIP_SLOTS = [
  { key: 'head', label: '头盔', icon: '👑' },
  { key: 'necklace', label: '项链', icon: '📿' },
  { key: 'wing', label: '翅膀', icon: '🪽' },
] as const;

export const SLOT_LABELS: Record<string, string> = {
  weapon: '武器',
  hand: '手套',
  foot: '鞋子',
  head: '头盔',
  necklace: '项链',
  wing: '翅膀',
  accessory2: '饰品',
};

export const RARITY_COLORS: Record<number, string> = {
  1: '#8c8c8c',
  2: '#52c41a',
  3: '#1890ff',
  4: '#722ed1',
  5: '#fa8c16',
  6: '#f5222d',
  7: '#eb2f96',
  8: '#fadb14',
};

export const RARITY_OPTIONS = [
  { label: '普通', value: 1 },
  { label: '优良', value: 2 },
  { label: '精良', value: 3 },
  { label: '史诗', value: 4 },
  { label: '传说', value: 5 },
  { label: '神话', value: 6 },
  { label: '至尊', value: 7 },
  { label: '神器', value: 8 },
];

export const rarityText = (rarity?: number) =>
  RARITY_OPTIONS.find((item) => item.value === rarity)?.label || '未知';

export const categoryText = (category?: string) => {
  const map: Record<string, string> = {
    equipment: '装备类',
    consumable: '消耗品',
    material: '材料',
  };
  return category ? map[category] || category : '-';
};

export const getPetId = (pet: any) => pet?.petId ?? pet?.id ?? pet?.petID;
