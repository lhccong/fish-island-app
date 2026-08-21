import { ApiResponse } from '@/api/user';
import { parseFriendLandsPayload } from '@/utils/farmUtils';
import { request } from '@/utils/request';

export interface FarmUserVO {
  userId?: number;
  userName?: string;
  userAvatar?: string;
  level?: number;
  totalHarvest?: number;
  friendCount?: number;
  experience?: number;
}

export interface LandDTO {
  id?: number;
  landIndex?: number;
  status?: number;
  locked?: number;
  plantedCropId?: number;
  cropName?: string;
  harvestTime?: string;
  plantedTime?: string;
  canSteal?: boolean;
  /** 解锁消耗积分（后端返回） */
  unlockCost?: number;
  /** 解锁所需农场等级 */
  unlockLevel?: number;
}

export interface CropDTO {
  id?: number;
  name?: string;
  icon?: string;
  category?: string;
  growthTime?: number;
  coin?: number;
  experience?: number;
  locked?: boolean;
  unlockLevel?: number;
  description?: string;
}

export interface FarmStealRecordVO {
  id?: number;
  /** 是否已读(0-未读、1-已读) */
  isRead?: number;
  stealerId?: number;
  stealerNickname?: string;
  stealerAvatar?: string;
  cropName?: string;
  coinGained?: number;
  stolenTime?: string;
}

export interface FarmStealRecord {
  id?: number;
  coinGained?: number;
  cropId?: number;
  landId?: number;
  ownerId?: number;
  plantRecordId?: number;
  stealerId?: number;
  stolenTime?: string;
}

/** 互关好友列表项（与 frontend FarmFriendListVO 一致） */
export interface FarmFriendListVO {
  friendId?: number | string;
  systemUserId?: number | string;
  nickname?: string;
  avatar?: string;
  level?: number;
  canSteal?: boolean;
  stealCooldown?: string;
}

/** 拜访好友农场时的本地状态 */
export interface FarmFriendFarmVO {
  friendUserId?: number | string;
  friendName?: string;
  friendAvatar?: string;
  lands?: LandDTO[];
}

export interface PlantItem {
  landId: number;
  cropId: number;
}

export interface StealRequest {
  landId?: number;
  landIds?: number[];
}

export const farmApi = {
  getMyFarmUser(): Promise<ApiResponse<FarmUserVO>> {
    return request.get('/api/farm/user/info');
  },

  getMyLands(): Promise<ApiResponse<LandDTO[]>> {
    return request.get('/api/land/my');
  },

  getAllCrops(): Promise<ApiResponse<CropDTO[]>> {
    return request.get('/api/crop/all');
  },

  plant(items: PlantItem[]): Promise<ApiResponse<LandDTO[]>> {
    return request.post('/api/land/plant', { items });
  },

  harvest(landIds: number[]): Promise<ApiResponse<LandDTO[]>> {
    return request.post('/api/land/harvest', { landIds });
  },

  /** 解锁地块（开辟新土地）POST /api/land/unlock */
  unlock(landId: number): Promise<ApiResponse<LandDTO>> {
    return request.post('/api/land/unlock', { landId });
  },

  getMyStolenRecords(): Promise<ApiResponse<FarmStealRecordVO[]>> {
    return request.get('/api/steal/my-stolen');
  },

  /** 偷菜记录一键已读 POST /api/steal/my-stolen/read-all */
  markAllStolenRecordsAsRead(): Promise<ApiResponse<boolean>> {
    return request.post('/api/steal/my-stolen/read-all');
  },

  /** 互关好友农场列表 GET /api/farm/friend/list */
  getFriendList(): Promise<ApiResponse<FarmFriendListVO[]>> {
    return request.get('/api/farm/friend/list');
  },

  /** 好友地块列表 GET /api/farm/friend/lands */
  getFriendLands(friendUserId: number | string): Promise<ApiResponse<LandDTO[]>> {
    return request.get('/api/farm/friend/lands', {
      friendUserId: String(friendUserId),
    });
  },

  /** 偷菜（单块 landId 或批量 landIds）POST /api/steal */
  steal(body: StealRequest): Promise<ApiResponse<FarmStealRecord[]>> {
    return request.post('/api/steal', body, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async loadFriendLands(friendUserId: number | string): Promise<LandDTO[]> {
    const res = await this.getFriendLands(friendUserId);
    if (res.code === 0 && res.data != null) {
      return parseFriendLandsPayload(res.data);
    }
    throw new Error(res.msg || res.message || '加载好友农场失败');
  },
};
