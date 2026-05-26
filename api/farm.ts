import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export interface FarmUserVO {
  userId?: number;
  userName?: string;
  userAvatar?: string;
  level?: number;
  totalHarvest?: number;
  friendCount?: number;
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
  plantRecordId?: number;
  canSteal?: boolean;
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
  plantRecordId?: number;
  stealerId?: number;
  stolenTime?: string;
}

/** 互关好友列表项 */
export interface FarmFriendListVO {
  /** 好友用户 ID，拜访接口 friendUserId */
  friendUserId?: number | string;
  userId?: number | string;
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

  getMyStolenRecords(): Promise<ApiResponse<FarmStealRecordVO[]>> {
    return request.get('/api/steal/my-stolen');
  },

  /** 互关好友农场列表（含偷菜状态） */
  getFriendList(): Promise<ApiResponse<FarmFriendListVO[]>> {
    return request.get('/api/farm/friend/list');
  },

  /** 获取好友农场地块 GET /api/farm/friend/lands?friendUserId= */
  getFriendLands(friendUserId: number | string): Promise<ApiResponse<LandDTO[]>> {
    return request.get('/api/farm/friend/lands', {
      friendUserId: String(friendUserId),
    });
  },

  /** 偷菜 */
  steal(plantRecordId: number): Promise<ApiResponse<FarmStealRecord>> {
    return request.post('/api/steal', { plantRecordId });
  },
};
