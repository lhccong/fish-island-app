import { request } from '@/utils/request';

export interface MomentMedia {
  type: 'image' | 'video';
  url: string;
}

export interface MomentComment {
  id: number;
  momentId: number;
  userId: number;
  userName: string;
  userAvatar: string;
  content: string;
  createTime: string;
  parentId?: number;
  replyUserName?: string;
  children?: MomentComment[];
}

export interface Moment {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  content: string;
  mediaJson: MomentMedia[];
  location?: string;
  liked: boolean;
  likeNum: number;
  likeUserNames: string;
  commentNum: number;
  createTime: string;
  visibility?: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message?: string;
  msg?: string;
}

export const momentsApi = {
  listMoments(params: {
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    userId?: string | number;
  }) {
    return request.post<ApiResponse<PageResult<Moment>>>('/api/moments/list', params);
  },

  publishMoment(data: {
    content: string;
    mediaJson?: MomentMedia[];
    location?: string;
    visibility?: number;
  }) {
    return request.post<ApiResponse>('/api/moments/publish', data);
  },

  updateMoment(data: {
    id: number;
    content?: string;
    mediaJson?: MomentMedia[];
    location?: string;
  }) {
    return request.post<ApiResponse>('/api/moments/update', data);
  },

  deleteMoment(data: { id: string }) {
    return request.post<ApiResponse>('/api/moments/delete', data);
  },

  toggleLike(data: { momentId: number }) {
    return request.post<ApiResponse>('/api/moments/like', data);
  },

  rewardMoment(data: { momentId: number; points: number }) {
    return request.post<ApiResponse>('/api/moments/reward', data);
  },

  listComments(data: { momentId: number; current?: number; pageSize?: number }) {
    return request.post<ApiResponse<PageResult<MomentComment>>>('/api/moments/comment/list', data);
  },

  addComment(data: { momentId: number; content: string; parentId?: number }) {
    return request.post<ApiResponse>('/api/moments/comment/add', data);
  },

  deleteComment(data: { id: string }) {
    return request.post<ApiResponse>('/api/moments/comment/delete', data);
  },
};
