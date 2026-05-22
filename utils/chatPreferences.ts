import { storage } from '@/utils/storage';

const REMARKS_CACHE_KEY = 'fishpi_user_remarks_cache';
const BLACKLIST_KEY_PREFIX = 'fishpi_blacklist_';

export type UserRemarksMap = Record<string, string>;

export type BlacklistUser = {
  userName: string;
  avatarUrl?: string;
};

export async function loadCachedRemarks(): Promise<UserRemarksMap> {
  try {
    const raw = await storage.getItem(REMARKS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveCachedRemarks(remarks: UserRemarksMap) {
  await storage.setItem(REMARKS_CACHE_KEY, JSON.stringify(remarks));
}

export async function loadBlacklist(currentUserName: string): Promise<BlacklistUser[]> {
  try {
    const raw = await storage.getItem(`${BLACKLIST_KEY_PREFIX}${currentUserName}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveBlacklist(currentUserName: string, list: BlacklistUser[]) {
  await storage.setItem(`${BLACKLIST_KEY_PREFIX}${currentUserName}`, JSON.stringify(list));
}
