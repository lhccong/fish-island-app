import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const bossApi = {
  getBossList() {
    return request.get('/api/boss/list');
  },

  getBossListWithCache(): Promise<ApiResponse> {
    return request.get('/api/boss/list/cache');
  },

  getBossBattleInfo(bossId: number | string) {
    return request.get('/api/boss/battle/info', { bossId });
  },

  battle(bossId: number | string) {
    return request.get('/api/boss/battle', { bossId });
  },

  getBossChallengeRanking(bossId: number | string, limit = 20) {
    return request.get('/api/boss/ranking', { bossId, limit });
  },
};
