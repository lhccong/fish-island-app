export const EQUIP_SLOT_TO_NUM: Record<string, number> = {
  weapon: 1,
  hand: 2,
  foot: 3,
  head: 4,
  necklace: 5,
  wing: 6,
};

export const ENTRY_GRADE_COLOR: Record<number, string> = {
  1: '#8c8c8c',
  2: '#1890ff',
  3: '#722ed1',
  4: '#fa8c16',
  5: '#f5222d',
};

export const ENTRY_GRADE_NAME: Record<number, string> = {
  1: '白',
  2: '蓝',
  3: '紫',
  4: '金',
  5: '红',
};

export const ENTRY_ATTR_NAME: Record<string, string> = {
  attack: '攻击力',
  defense: '防御力',
  hp: '生命值',
  maxHp: '生命值',
  speed: '速度',
  critRate: '暴击率',
  critResistance: '暴击抗性',
  antiCrit: '暴击抗性',
  dodgeRate: '闪避率',
  dodgeResistance: '闪避抗性',
  antiDodge: '闪避抗性',
  comboRate: '连击率',
  comboResistance: '连击抗性',
  antiCombo: '连击抗性',
  blockRate: '格挡率',
  blockResistance: '格挡抗性',
  antiBlock: '格挡抗性',
  lifesteal: '生命偷取',
  lifestealResistance: '吸血抗性',
  antiLifesteal: '吸血抗性',
};

const PERCENT_ATTRS = new Set([
  'critRate',
  'critResistance',
  'antiCrit',
  'dodgeRate',
  'dodgeResistance',
  'antiDodge',
  'comboRate',
  'comboResistance',
  'antiCombo',
  'blockRate',
  'blockResistance',
  'antiBlock',
  'lifesteal',
  'lifestealResistance',
  'antiLifesteal',
]);

export const isPercentAttr = (attr: string) => PERCENT_ATTRS.has(attr);

export const formatEntryValue = (attr: string, value?: number) => {
  const n = Number(value || 0);
  if (isPercentAttr(attr)) {
    return `${Number((n * 100).toFixed(2))}%`;
  }
  return `+${n}`;
};

export const getEntryAttrName = (attr?: string) =>
  (attr && ENTRY_ATTR_NAME[attr]) || attr || '未知';

export type ForgeEntry = {
  attr?: string;
  value?: number;
  grade?: number;
  locked?: boolean;
};

export type ForgeDetail = {
  equipLevel?: number;
  maxLevel?: boolean;
  nextUpgradeCost?: number;
  successRate?: number;
  entry1?: ForgeEntry | null;
  entry2?: ForgeEntry | null;
  entry3?: ForgeEntry | null;
  entry4?: ForgeEntry | null;
};

export const getForgeEntries = (detail: ForgeDetail | null) => {
  if (!detail) return [];
  return [detail.entry1, detail.entry2, detail.entry3, detail.entry4]
    .map((entry, idx) => ({ index: idx + 1, data: entry }))
    .filter((item) => !!item.data);
};

export const syncLockedFromDetail = (detail: ForgeDetail | null): number[] => {
  if (!detail) return [];
  return [detail.entry1, detail.entry2, detail.entry3, detail.entry4]
    .map((entry, idx) => (entry?.locked ? idx + 1 : null))
    .filter((v): v is number => v !== null);
};
