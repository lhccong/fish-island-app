import type { FarmFriendListVO, LandDTO } from '@/api/farm';

export const GRID_COLS = 6;
export const GRID_ROWS = 4;
export const TOTAL_LANDS = GRID_COLS * GRID_ROWS;

export const FARM_HARVEST_ICON = 'https://oss.cqbo.com/moyu/farm/toucai.png';

export const LAND_STATUS = {
  EMPTY: 0,
  GROWING: 1,
  MATURE: 2,
} as const;

export const CATEGORY_LABEL: Record<string, string> = {
  grain: '粮食',
  vegetable: '蔬菜',
  fruit: '水果',
  flower: '花卉',
  specialty: '特产',
};

export const SLOT_ORDER = Array.from({ length: TOTAL_LANDS }, (_, i) => i);

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '即将成熟';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

export function buildLandGrid(lands: LandDTO[]): (LandDTO | null)[] {
  const grid: (LandDTO | null)[] = Array(TOTAL_LANDS).fill(null);
  const landByIndex = new Map<number, LandDTO>();
  lands.forEach((land) => {
    const li = land.landIndex;
    if (li != null && li >= 1 && li <= TOTAL_LANDS) {
      landByIndex.set(li, land);
    }
  });
  SLOT_ORDER.forEach((arrayIndex) => {
    const land = landByIndex.get(arrayIndex + 1);
    if (land) grid[arrayIndex] = land;
  });
  return grid;
}

export function toLandIndex(arrayIndex: number): number {
  return arrayIndex + 1;
}

export function mergeLandUpdates(prev: LandDTO[], updates: LandDTO[]): LandDTO[] {
  if (!updates?.length) return prev;
  const byId = new Map<number, LandDTO>();
  const byIndex = new Map<number, LandDTO>();
  updates.forEach((land) => {
    if (land.id != null) byId.set(land.id, land);
    if (land.landIndex != null) byIndex.set(land.landIndex, land);
  });
  let hit = false;
  const merged = prev.map((land) => {
    if (land.id != null && byId.has(land.id)) {
      hit = true;
      return byId.get(land.id)!;
    }
    if (land.landIndex != null && byIndex.has(land.landIndex)) {
      hit = true;
      return byIndex.get(land.landIndex)!;
    }
    return land;
  });
  return hit ? merged : [...prev, ...updates];
}

export function isLandUnlocked(land: LandDTO | null | undefined): boolean {
  if (!land?.id) return false;
  return land.locked !== 1;
}

export function isLandEmpty(land: LandDTO | null | undefined): boolean {
  if (!isLandUnlocked(land)) return false;
  const status = land?.status;
  return status == null || status === LAND_STATUS.EMPTY;
}

export function isLandMature(land: LandDTO | null | undefined, currentNow: number): boolean {
  if (!land) return false;
  if (land.status === LAND_STATUS.MATURE) return true;
  if (land.status !== LAND_STATUS.GROWING || !land.harvestTime) return false;
  return new Date(land.harvestTime).getTime() <= currentNow;
}

export function isCropIconUrl(icon?: string): boolean {
  if (!icon) return false;
  const v = icon.trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith('//') ||
    v.startsWith('/') ||
    v.startsWith('data:')
  );
}

/** 好友偷菜冷却剩余文案 */
export function formatStealCooldown(cooldown?: string, now = Date.now()): string {
  if (!cooldown) return '';
  const end = new Date(cooldown).getTime();
  if (Number.isNaN(end)) return '';
  const ms = end - now;
  if (ms <= 0) return '';
  return formatCountdown(ms);
}

export function formatStolenTime(time?: string): string {
  if (!time) return '';
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

type FriendUserIdSource = {
  friendUserId?: number | string;
  userId?: number | string;
  systemUserId?: number | string;
  id?: number | string;
  /** 列表里的 friendId 多为关系序号，不能当作 friendUserId */
  friendId?: number | string;
};

/** 拜访接口需要的用户 ID（friendUserId），优先真实用户字段 */
export function resolveFriendUserId(friend: FriendUserIdSource): number | string | null {
  const raw =
    friend.friendUserId ??
    friend.userId ??
    friend.systemUserId ??
    friend.id ??
    friend.friendId;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  return null;
}

/** @deprecated 使用 resolveFriendUserId */
export const resolveFarmFriendId = resolveFriendUserId;

export function normalizeFarmFriend(raw: Record<string, unknown>): FarmFriendListVO {
  const friendUserId = resolveFriendUserId({
    friendUserId: raw.friendUserId as number | string | undefined,
    userId: raw.userId as number | string | undefined,
    systemUserId: raw.systemUserId as number | string | undefined,
    id: raw.id as number | string | undefined,
    friendId: raw.friendId as number | string | undefined,
  });
  return {
    friendUserId: friendUserId ?? undefined,
    userId: friendUserId ?? undefined,
    systemUserId: friendUserId ?? undefined,
    nickname: String(raw.nickname ?? raw.userName ?? raw.nickName ?? '好友'),
    avatar: (raw.avatar ?? raw.userAvatar) as string | undefined,
    level: Number(raw.level) || 1,
    canSteal: Boolean(raw.canSteal),
    stealCooldown: raw.stealCooldown as string | undefined,
  };
}

export function parseFriendLandsPayload(data: unknown): LandDTO[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { lands?: LandDTO[] }).lands)) {
    return (data as { lands: LandDTO[] }).lands;
  }
  return [];
}
