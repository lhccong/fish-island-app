import { request } from '@/utils/request';

export interface EventRemindSender {
  id?: number;
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
}

export interface EventRemind {
  id?: number;
  action?: string;
  createTime?: string;
  recipientId?: number;
  remindTime?: string;
  senderId?: number;
  senderUser?: EventRemindSender;
  sourceContent?: string;
  sourceId?: number;
  sourceType?: number;
  state?: number;
  url?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
  msg?: string;
}

export const SOURCE_TYPE_MOMENTS = 4;

export const eventRemindApi = {
  listMyPage(params: {
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  }) {
    return request.post<ApiResponse<PageResult<EventRemind>>>('/api/event_remind/my/list/page', {
      current: params.current ?? 1,
      pageSize: params.pageSize ?? 10,
      sortField: params.sortField ?? 'createTime',
      sortOrder: params.sortOrder ?? 'descend',
    });
  },

  batchSetRead(ids: number[]) {
    return request.post<ApiResponse<boolean>>('/api/event_remind/batch/set/read', { ids });
  },

  batchDelete(ids: number[]) {
    return request.post<ApiResponse<boolean>>('/api/event_remind/batch/delete', { ids });
  },
};
