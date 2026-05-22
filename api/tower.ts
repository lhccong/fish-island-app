import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const towerApi = {
  getProgress() {
    return request.get('/api/tower/progress');
  },

  getRanking(limit = 20) {
    return request.get('/api/tower/ranking', { limit });
  },

  getFloorMonster(floor: number) {
    return request.get('/api/tower/floor', { floor });
  },

  challenge() {
    return request.post('/api/tower/challenge');
  },
};
