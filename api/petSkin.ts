import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

const PATHS = {
  list: ['/api/api/pet/skin/list', '/api/petSkin/list'],
  exchange: ['/api/api/pet/skin/exchange', '/api/petSkin/exchange'],
  set: ['/api/api/pet/skin/set', '/api/petSkin/set'],
};

async function getWithFallback(paths: string[], params?: Record<string, unknown>) {
  let lastErr: unknown;
  for (const path of paths) {
    try {
      return await request.get(path, params);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function postWithFallback(paths: string[], data?: Record<string, unknown>) {
  let lastErr: unknown;
  for (const path of paths) {
    try {
      return await request.post(path, data);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export const petSkinApi = {
  listPetSkins(params: { current?: number; pageSize?: number } = {}): Promise<ApiResponse> {
    return getWithFallback(PATHS.list, {
      current: 1,
      pageSize: 100,
      ...params,
    });
  },

  exchangePetSkin(skinId: number | string): Promise<ApiResponse> {
    return postWithFallback(PATHS.exchange, { skinId });
  },

  setPetSkin(skinId: number | string): Promise<ApiResponse> {
    return postWithFallback(PATHS.set, { skinId });
  },
};

export const normalizeSkinList = (res: ApiResponse | null | undefined) => {
  if (res == null) return [];
  if (res.code !== undefined && res.code !== 0) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d?.records && Array.isArray(d.records)) return d.records;
  return [];
};
