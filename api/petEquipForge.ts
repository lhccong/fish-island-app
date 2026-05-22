import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const petEquipForgeApi = {
  getForgeDetail(body: { petId: number; equipSlot: number }): Promise<ApiResponse> {
    return request.post('/api/pet/forge/detail', body);
  },

  upgradeEquip(body: { petId: number; equipSlot: number }): Promise<ApiResponse> {
    return request.post('/api/pet/forge/upgrade', body);
  },

  refreshEntries(body: { petId: number; equipSlot: number }): Promise<ApiResponse> {
    return request.post('/api/pet/forge/refresh', body);
  },

  lockEntries(body: {
    petId: number;
    equipSlot: number;
    lockedEntries: number[];
  }): Promise<ApiResponse> {
    return request.post('/api/pet/forge/lock', body);
  },
};
