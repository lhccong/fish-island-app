import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

/** 与 frontend petRankController 一致 */
const RANK_LIST_PATHS = ['/api/api/pet/rank/list', '/api/pet/rank/list'];

async function getWithFallback(paths: string[], params?: Record<string, unknown>) {
  let lastRes: ApiResponse | undefined;
  for (const path of paths) {
    try {
      const res = await request.get<ApiResponse>(path, params);
      if (res?.code === 0) {
        return res;
      }
      lastRes = res;
    } catch {
      // try next path
    }
  }
  if (lastRes) return lastRes;
  throw new Error('获取排行榜失败');
}

export const petApi = {
  /**
   * 宠物排行榜（frontend 使用 /api/api/pet/rank/list）
   */
  async getPetRankList(params: { limit?: number } = {}): Promise<ApiResponse> {
    const requestParams = {
      limit: params.limit ?? 20,
      ...params,
    };
    return getWithFallback(RANK_LIST_PATHS, requestParams);
  },

  /**
   * 查看其他用户宠物（参数名必须为 otherUserId，与 frontend 一致）
   */
  getOtherUserPet(otherUserId: number | string): Promise<ApiResponse> {
    return request.get('/api/pet/other', { otherUserId });
  },

  listItemTemplates(params: {
    current?: number;
    pageSize?: number;
    category?: string;
    rarity?: number;
  } = {}) {
    return request.post('/api/itemTemplates/list/page/vo', {
      current: 1,
      pageSize: 20,
      ...params,
    });
  },
};
