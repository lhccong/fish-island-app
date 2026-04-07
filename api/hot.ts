import { request } from '@/utils/request';

export interface HotPost {
  title: string;
  url?: string;
  followerCount?: number;
}

export interface HotCategory {
  id: string | number;
  name: string;
  iconUrl?: string;
  updateTime?: string;
  data: HotPost[];
}

export const hotApi = {
  getHotPostList(): Promise<{ code: number; data?: HotCategory[]; message?: string }> {
    return request.post('/api/hot/list', {});
  },
};
