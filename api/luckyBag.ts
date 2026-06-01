import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export interface LuckyBag {
  id?: string;
  name?: string;
  totalAmount?: number;
  winnerCount?: number;
  participantCount?: number;
  type?: number;
  status?: number;
  joined?: boolean;
  creatorName?: string;
  creatorAvatar?: string;
  drawTime?: string;
  expireTime?: string;
  durationSeconds?: number;
}

export interface LuckyBagWinRecord {
  id?: string;
  userName?: string;
  userAvatar?: string;
  amount?: number;
  winTime?: string;
}

export interface CreateLuckyBagRequest {
  totalAmount: number;
  winnerCount: number;
  type: number;
  name?: string;
  durationSeconds?: number;
}

export const luckyBagApi = {
  getActive(): Promise<ApiResponse<LuckyBag[]>> {
    return request.get('/api/luckybag/active');
  },

  create(body: CreateLuckyBagRequest): Promise<ApiResponse<LuckyBag>> {
    return request.post('/api/luckybag/create', body, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  getDetail(luckyBagId: string): Promise<ApiResponse<LuckyBag>> {
    return request.get('/api/luckybag/detail', { luckyBagId });
  },

  join(luckyBagId: string): Promise<ApiResponse<boolean>> {
    return request.instance.post('/api/luckybag/join', null, {
      params: { luckyBagId },
    });
  },

  getRecords(luckyBagId: string): Promise<ApiResponse<LuckyBagWinRecord[]>> {
    return request.get('/api/luckybag/records', { luckyBagId });
  },
};
