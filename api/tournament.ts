import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const tournamentApi = {
  getLeaderboard() {
    return request.get('/api/pet/tournament/leaderboard');
  },

  getMyRank() {
    return request.get('/api/pet/tournament/my/rank');
  },

  challenge(targetRank: number) {
    return request.post('/api/pet/tournament/challenge', {}, {
      params: { targetRank },
    });
  },
};
