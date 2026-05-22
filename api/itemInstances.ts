import { ApiResponse } from '@/api/user';
import { request } from '@/utils/request';

export const itemInstancesApi = {
  listMyItemInstances(
    params: { current?: number; pageSize?: number; category?: string } = {},
  ): Promise<ApiResponse> {
    return request.post('/api/itemInstances/my/list/page/vo', {
      current: 1,
      pageSize: 30,
      ...params,
    });
  },

  /** 批量分解蓝色、绿色品质装备（与 frontend 一致） */
  batchDecomposeBlueGreen(): Promise<ApiResponse> {
    return request.post('/api/itemInstances/batchDecomposeBlueGreen', {});
  },

  equipItem(itemInstanceId: number | string): Promise<ApiResponse> {
    return request.post('/api/itemInstances/equip', { itemInstanceId });
  },

  unequipItem(equipSlot: string): Promise<ApiResponse> {
    return request.post('/api/itemInstances/unequip', { equipSlot });
  },

  decomposeItem(itemInstanceId: number | string): Promise<ApiResponse> {
    return request.post('/api/itemInstances/decompose', { itemInstanceId });
  },
};
