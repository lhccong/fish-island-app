import { GRID_COLS, GRID_ROWS } from '@/utils/farmUtils';

export const FARM_GRID_GAP = 5;

/** 根据容器宽度计算 6 列地块边长（保证不换行） */
export function calcTileSize(containerWidth: number, maxTile = 72): number {
  if (containerWidth <= 0) return 48;
  const raw = (containerWidth - FARM_GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  return Math.max(36, Math.min(raw, maxTile));
}

export function calcGridSize(tileSize: number) {
  const slotH = tileSize * 1.05;
  return {
    width: GRID_COLS * tileSize + FARM_GRID_GAP * (GRID_COLS - 1),
    height: GRID_ROWS * slotH + FARM_GRID_GAP * (GRID_ROWS - 1),
    slotH,
  };
}

/** 小地块上的倒计时（尽量单行） */
export function formatCountdownCompact(ms: number, tileSize: number): string {
  if (ms <= 0) return '成熟';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (tileSize < 46) {
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
  if (h > 0) return `${h}时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}
