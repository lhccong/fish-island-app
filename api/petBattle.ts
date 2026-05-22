import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const petBattleApi = {
  getPetBattleInfo(opponentUserId: number | string) {
    return request.get('/api/pet/battle/info', { opponentUserId });
  },

  startBattle(opponentUserId: number | string) {
    return request.get('/api/pet/battle/start', { opponentUserId });
  },
};
