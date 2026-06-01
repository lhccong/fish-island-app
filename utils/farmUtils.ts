import type { FarmFriendListVO, FarmStealRecordVO, LandDTO } from '@/api/farm';

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
export function formatStealCooldown(cooldown?: string | number, now = Date.now()): string {
  if (cooldown == null || cooldown === '') return '';
  if (typeof cooldown === 'number' && Number.isFinite(cooldown)) {
    const ms = cooldown > 1e12 ? cooldown - now : cooldown;
    if (ms <= 0) return '';
    return formatCountdown(ms);
  }
  const end = new Date(cooldown).getTime();
  if (Number.isNaN(end)) return '';
  const ms = end - now;
  if (ms <= 0) return '';
  return formatCountdown(ms);
}

/** 雪花 ID 等长整型：始终以字符串传递 */
export function toUserIdString(id: string | number | undefined | null): string | undefined {
  if (id == null || id === '') return undefined;
  return typeof id === 'string' ? id : String(id);
}

/** 好友列表项上的用户 ID（与 frontend getFriendUserId 一致） */
export function getFriendUserId(friend: FarmFriendListVO | Record<string, unknown>): string | undefined {
  const raw = friend as Record<string, unknown>;
  return toUserIdString((raw.friendId ?? raw.systemUserId) as string | number | undefined);
}

/** 拜访好友农场时地块是否可交互 */
export function isFriendLandPlot(land: LandDTO | null | undefined): boolean {
  if (!land) return false;
  return land.locked !== 1;
}

/** 偷菜接口所需地块 ID */
export function resolveStealLandId(land: LandDTO | null | undefined): number | null {
  if (land?.id == null) return null;
  const id = Number(land.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** 好友农场：成熟、有地块 ID 且 canSteal===true */
export function canStealOnFriendLand(land: LandDTO, currentNow: number): boolean {
  return (
    isFriendLandPlot(land) &&
    isLandMature(land, currentNow) &&
    resolveStealLandId(land) != null &&
    land.canSteal === true
  );
}

/** 汇总批量偷菜返回的积分 */
export function sumStealCoinGained(records?: { coinGained?: number }[]): number {
  return (records ?? []).reduce((sum, record) => sum + (record.coinGained ?? 0), 0);
}

export function unwrapFarmFriendList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.records)) return obj.records as Record<string, unknown>[];
    if (Array.isArray(obj.list)) return obj.list as Record<string, unknown>[];
    if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  }
  return [];
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

/** 偷菜记录是否未读（0-未读、1-已读） */
export function isFarmStealRecordUnread(record: FarmStealRecordVO): boolean {
  return record.isRead !== 1;
}

/** 拜访接口 friendUserId（字符串） */
export function resolveFriendUserId(
  friend: FarmFriendListVO | Record<string, unknown>,
): string | null {
  const id = getFriendUserId(friend);
  return id ?? null;
}

/** @deprecated 使用 getFriendUserId */
export const resolveFarmFriendId = resolveFriendUserId;

export function normalizeFarmFriend(raw: Record<string, unknown>): FarmFriendListVO {
  if (!raw || typeof raw !== 'object') {
    return {
      nickname: '好友',
      level: 1,
      canSteal: false,
      stealCooldown: undefined,
    };
  }

  const stealCooldown =
    (raw.stealCooldown ??
      raw.stealCoolDown ??
      raw.steal_cooldown ??
      raw.cooldownEndTime ??
      raw.nextStealTime ??
      raw.stealCooldownEnd) as string | undefined;

  return {
    friendId: (raw.friendId ?? raw.friend_id) as number | string | undefined,
    systemUserId: (raw.systemUserId ?? raw.system_user_id) as number | string | undefined,
    nickname: String(
      raw.nickname ?? raw.userName ?? raw.nickName ?? raw.friendName ?? '好友',
    ),
    avatar: (raw.avatar ?? raw.userAvatar ?? raw.friendAvatar) as string | undefined,
    level: Number(raw.level ?? raw.farmLevel ?? raw.userLevel) || 1,
    canSteal: raw.canSteal === true,
    stealCooldown,
  };
}

function unwrapLandRaw(raw: Record<string, unknown> | LandDTO | null | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const nested = obj.landDTO ?? obj.landDto ?? obj.land;
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return obj;
}

export function normalizeLand(raw: Record<string, unknown>): LandDTO {
  const source = unwrapLandRaw(raw);
  if (!source) return raw as LandDTO;
  return {
    ...(source as LandDTO),
    cropName: (source.cropName ?? source.crop_name) as string | undefined,
    harvestTime: (source.harvestTime ?? source.harvest_time) as string | undefined,
    plantedTime: (source.plantedTime ?? source.planted_time) as string | undefined,
    plantedCropId: (source.plantedCropId ?? source.planted_crop_id) as number | undefined,
    landIndex: (source.landIndex ?? source.land_index) as number | undefined,
  };
}

export function parseFriendLandsPayload(data: unknown): LandDTO[] {
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map((land) => normalizeLand(land));
  }
  if (data && typeof data === 'object' && Array.isArray((data as { lands?: unknown }).lands)) {
    return ((data as { lands: Record<string, unknown>[] }).lands).map((land) =>
      normalizeLand(land),
    );
  }
  return [];
}
