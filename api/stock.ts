import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const stockApi = {
  getMajorIndices() {
    return request.get('/api/fund/indices');
  },

  getPosition() {
    return request.get('/api/index/trade/position');
  },

  getPositions() {
    return request.get('/api/index/trade/positions');
  },

  buy(body: { indexCode: string; amount: number }) {
    return request.post('/api/index/trade/buy', body);
  },

  sell(body: { indexCode: string; shares: number }) {
    return request.post('/api/index/trade/sell', body);
  },

  getTransactions(body: { current?: number; pageSize?: number } = {}) {
    return request.post('/api/index/trade/transactions', {
      current: body.current ?? 1,
      pageSize: body.pageSize ?? 10,
    });
  },
};
