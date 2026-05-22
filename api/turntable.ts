import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const turntableApi = {
  listTurntables() {
    return request.get('/api/turntable/list');
  },

  getTurntableDetail(id: number | string) {
    return request.get(`/api/turntable/detail/${id}`);
  },

  draw(body: { turntableId: number | string; drawCount: number }) {
    return request.post('/api/turntable/draw', body);
  },

  listDrawRecords(params: {
    current?: number;
    pageSize?: number;
    turntableId?: number | string;
    sortField?: string;
    sortOrder?: string;
  } = {}) {
    return request.get('/api/turntable/records', {
      current: params.current ?? 1,
      pageSize: params.pageSize ?? 13,
      sortField: params.sortField ?? 'createTime',
      sortOrder: params.sortOrder ?? 'descend',
      ...(params.turntableId != null ? { turntableId: params.turntableId } : {}),
    });
  },
};
