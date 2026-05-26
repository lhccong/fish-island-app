import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export interface UserFollowVO {
  userId: number | string;
  userName?: string;
  userAvatar?: string;
  avatarFramerUrl?: string;
  userProfile?: string;
  isMutual?: boolean;
}

export interface PageFollowResult {
  records: UserFollowVO[];
  total?: number;
}

export const followApi = {
  isFollowing(followUserId: string | number): Promise<ApiResponse<boolean>> {
    return request.get('/api/follow/is-following', { followUserId: String(followUserId) });
  },

  toggleFollow(followUserId: string | number): Promise<ApiResponse<boolean>> {
    return request.get('/api/follow/toggle', { followUserId: String(followUserId) });
  },

  listMyFollowing(params: { current?: number; pageSize?: number } = {}) {
    return request.get<ApiResponse<PageFollowResult>>('/api/follow/following', {
      current: 1,
      pageSize: 50,
      ...params,
    });
  },

  listMyFollowers(params: { current?: number; pageSize?: number } = {}) {
    return request.get<ApiResponse<PageFollowResult>>('/api/follow/followers', {
      current: 1,
      pageSize: 50,
      ...params,
    });
  },
};
