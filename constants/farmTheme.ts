/**
 * 与 frontend Farm/index.less 对齐的农场主题常量
 * .farm-page { background: linear-gradient(180deg, #b8e0f5 0%, #d4edba 45%, #9ccc65 100%); }
 */

export const FARM_SKY_GRADIENT = ['#b8e0f5', '#d4edba', '#9ccc65'] as const;

/** frontend 渐变停靠点（与 CSS 百分比一致） */
export const FARM_SKY_GRADIENT_LOCATIONS = [0, 0.45, 1] as const;

export const FARM_HEADER_BG = 'rgba(255, 252, 240, 0.96)';

export const FARM_LAND = {
  color: '#bf8967',
  light: '#d4a882',
  dark: '#a67555',
  shadow: '#7d5a42',
} as const;

export const FARM_FIELD_BOARD = {
  outer: ['#8bc34a', '#7cb342', '#689f38'] as const,
  inner: ['#f0e2cc', '#e6d4b4', '#dcc8a8'] as const,
};

export const FARM_STAT_CHIP = {
  bg: '#f6ffed',
  border: '#b7eb8f',
  text: '#389e0d',
  pointsBg: '#fff7e6',
  pointsBorder: '#ffd591',
  pointsText: '#d46b08',
};

export const FARM_FRIENDS_FAB = {
  border: '#f5e6a8',
  gradient: ['#d4b896', '#a67c52', '#8b5e3c'] as const,
  text: '#fff8e8',
  icon: '#ffd54f',
};
