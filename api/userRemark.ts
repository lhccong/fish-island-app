import { request } from '@/utils/request';

export const userRemarkApi = {
  getRemark() {
    return request.get('/api/userRemark/get');
  },

  saveRemark(content: string) {
    return request.post('/api/userRemark/save', { content });
  },
};
