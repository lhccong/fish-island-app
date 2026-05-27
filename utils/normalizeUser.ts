import type { UserInfo } from '@/api/user';
import type { UserProfileSnapshot } from '@/components/UserInfoCard';

/** 可用于 getUserVoById 的正整数用户 id */
export function isValidLookupUserId(id: string | number | null | undefined): boolean {
  if (id == null || id === '') return false;
  const s = String(id).trim();
  if (!/^\d+$/.test(s)) return false;
  try {
    return BigInt(s) > 0n;
  } catch {
    return false;
  }
}

export function userInfoToProfileSnapshot(user: UserInfo): UserProfileSnapshot {
  return {
    id: user.id,
    userId: user.id,
    userName: user.userName,
    userNickname: user.userNickname || user.userName,
    userAvatar: user.userAvatar,
    userAvatarURL: user.userAvatar,
    level: user.level,
    points: user.points ?? user.userPoint,
    userPoint: user.userPoint ?? user.points,
    vip: user.vip,
    isVip: user.vip,
    avatarFramerUrl: user.avatarFramerUrl,
    followerCount: user.followerCount,
    followingCount: user.followingUserCount,
    isAdmin: user.userRole === 'admin',
    userOnlineFlag: user.userOnlineFlag,
  };
}

export function unwrapApiData<T = any>(raw: any): T | null {
  if (!raw) return null;
  if (raw.code !== undefined && raw.code !== 0) return null;
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return raw.data as T;
  }
  return raw as T;
}

export function normalizeSeedUser(user: UserProfileSnapshot | null): UserProfileSnapshot | null {
  if (!user) return null;
  const id = user.id ?? user.userId;
  return {
    ...user,
    id: id != null ? String(id) : undefined,
    userId: id != null ? String(id) : undefined,
    userName: user.userName || user.name,
    userNickname: user.userNickname || user.name || user.userName,
    points: user.points ?? user.userPoint,
    userPoint: user.userPoint ?? user.points,
  };
}

export function mergeUserProfile(
  seed: UserProfileSnapshot,
  full: Record<string, any>,
): UserProfileSnapshot {
  const id = full.id ?? full.userId ?? seed.id ?? seed.userId;
  return {
    ...seed,
    ...full,
    id: id != null ? String(id) : seed.id,
    userId: id != null ? String(id) : seed.userId,
    userName: full.userName || full.name || seed.userName,
    userNickname:
      full.userNickname || full.nickname || full.userName || full.name || seed.userNickname,
    points: full.points ?? full.userPoint ?? seed.points,
    userPoint: full.userPoint ?? full.points ?? seed.userPoint,
    followingCount: full.followingCount ?? full.followingUserCount ?? seed.followingCount,
    followerCount: full.followerCount ?? seed.followerCount,
  };
}
