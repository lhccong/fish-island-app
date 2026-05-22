/** 与 frontend MoyuPet 装备展示一致的稀有度 */
export const EQUIP_RARITY_NAMES: Record<number, string> = {
  1: '优良',
  2: '精良',
  3: '史诗',
  4: '传说',
  5: '神话',
  6: '至尊',
  7: '神器',
};

/** 与 frontend MoyuPet getEnhanceTier 一致 */
export const getEnhanceTier = (level: number): number => {
  if (level <= 0) return 0;
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  if (level <= 9) return 3;
  if (level <= 14) return 4;
  return 5;
};

export const EQUIP_RARITY_COLORS: Record<number, string> = {
  1: '#52c41a',
  2: '#1890ff',
  3: '#722ed1',
  4: '#fa8c16',
  5: '#f5222d',
  6: '#eb2f96',
  7: '#fadb14',
};

export const formatPercentStat = (value?: number) => {
  const n = Number(value || 0);
  if (n <= 0) return null;
  return `+${(n * 100).toFixed(1)}%`;
};

export type EquipStatRow = { icon: string; label: string; text: string };

/** 装备属性加成列表（与 frontend 装备 Tab 一致） */
export const buildEquipStatRows = (equipStats: any): EquipStatRow[] => {
  if (!equipStats) return [];
  const rows: EquipStatRow[] = [];

  const pushNum = (icon: string, label: string, value?: number, prefix = '+') => {
    if (value != null && value > 0) {
      rows.push({ icon, label, text: `${label}: ${prefix}${value}` });
    }
  };

  pushNum('💥', '攻击加成', equipStats.totalBaseAttack);
  pushNum('🛡️', '防御加成', equipStats.totalBaseDefense);
  pushNum('❤️', '生命加成', equipStats.totalBaseHp);
  if (equipStats.totalBaseSpeed > 0) {
    pushNum('⚡', '速度加成', equipStats.totalBaseSpeed);
  }

  const pushPct = (icon: string, label: string, value?: number) => {
    const text = formatPercentStat(value);
    if (text) rows.push({ icon, label, text: `${label}: ${text}` });
  };

  pushPct('💥', '暴击率', equipStats.critRate);
  pushPct('💨', '闪避率', equipStats.dodgeRate);
  pushPct('🛡️', '格挡率', equipStats.blockRate);
  pushPct('⚡', '连击率', equipStats.comboRate);
  pushPct('🩸', '吸血', equipStats.lifesteal);
  pushPct('🔰', '暴击抵抗', equipStats.critResistance);
  pushPct('👁️', '闪避抵抗', equipStats.dodgeResistance);
  pushPct('🛡️', '格挡抵抗', equipStats.blockResistance);
  pushPct('⚡', '连击抵抗', equipStats.comboResistance);
  pushPct('🩸', '吸血抵抗', equipStats.lifestealResistance);

  return rows;
};
