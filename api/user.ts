import { request } from '@/utils/request';

// 用户信息类型
export interface UserInfo {
  id?: number;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  userProfile?: string;
  email?: string;
  points?: number;
  usedPoints?: number;
  level?: number;
  vip?: boolean;
  avatarFramerUrl?: string;
  bindPlatforms?: any[];
  createTime?: string;
  updateTime?: string;
  lastSignInDate?: string;
  titleId?: number;
  titleIdList?: string;
  // 兼容旧字段
  userNickname?: string;
  userOnlineFlag?: boolean;
  onlineMinute?: number;
  userNo?: string;
  userPoint?: number;
  userIntro?: string;
  followingUserCount?: number;
  followerCount?: number;
  // 认证信息
  tokenName?: string;
  tokenValue?: string;
  apiKey?: string;
  saTokenInfo?: {
    tokenName: string;
    tokenValue: string;
  };
}

// 登录响应类型
export interface LoginResponse {
  code: number;
  data?: UserInfo;
  message?: string;
  msg?: string;
}

// API 响应通用类型
export interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message?: string;
  msg?: string;
}

export const userApi = {
  // 登录（旧接口，保留兼容）
  async login(nameOrEmail: string, userPassword: string, mfaCode?: string): Promise<LoginResponse> {
    return request.post('/api/getKey', {
      nameOrEmail,
      userPassword,
      mfaCode,
    });
  },

  // 用户账号登录
  async userLogin(userAccount: string, userPassword: string): Promise<LoginResponse> {
    return request.post('/api/user/login', {
      userAccount,
      userPassword,
    });
  },

  // 用户邮箱登录
  async userEmailLogin(email: string, userPassword: string): Promise<LoginResponse> {
    return request.post('/api/user/email/login', {
      email,
      userPassword,
    });
  },

  // 注册
  async register(data: any): Promise<ApiResponse> {
    return request.post('/register', data);
  },

  // 验证短信验证码
  async verifyCode(code: string): Promise<ApiResponse> {
    return request.get('/verify', { code });
  },

  // 完成注册
  async completeRegister(data: any, inviteUser?: string): Promise<ApiResponse> {
    return request.post('/register2', { data, inviteUser });
  },

  /**
   * 获取当前登录用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    return request.get('/api/user/get/login');
  },

  // 获取宠物详情
  async getPetDetail(): Promise<ApiResponse> {
    return request.get('/api/pet/my/get');
  },

  /**
   * 抚摸宠物，消耗 3 积分并提升心情，1 小时冷却
   */
  async patPet(petId: number | string): Promise<ApiResponse> {
    if (petId === undefined || petId === null || petId === '') {
      return Promise.reject(new Error('宠物 ID 不能为空'));
    }
    return request.post('/api/pet/pat', {}, {
      params: { petId },
    });
  },

  /**
   * 喂食宠物，消耗 5 积分，提升饱腹和心情，1 小时冷却
   */
  async feedPet(petId: number | string): Promise<ApiResponse> {
    if (petId === undefined || petId === null || petId === '') {
      return Promise.reject(new Error('宠物 ID 不能为空'));
    }
    return request.post('/api/pet/feed', {}, {
      params: { petId },
    });
  },

  // 获取用户资料
  async getUserProfile(identifier: string | number): Promise<ApiResponse> {
    const shouldUseIdLookup =
      typeof identifier === 'number' ||
      (typeof identifier === 'string' && /^\d+$/.test(identifier.trim()));

    if (shouldUseIdLookup) {
      return this.getUserVoById(identifier as number);
    }
    return request.get(`/user/${identifier}`);
  },

  async getUserVoById(id: number | string): Promise<ApiResponse> {
    if (typeof id === 'undefined' || id === null || id === '') {
      return { code: -1, message: 'ID不能为空' };
    }
    const normalizedId = typeof id === 'string' ? id.trim() : String(id);
    return request.get('/api/user/get/vo', { id: normalizedId });
  },

  // 更新用户资料
  async updateUserProfile(data: any): Promise<ApiResponse> {
    return request.put('/api/user', data);
  },

  // 获取活跃度
  async getLiveness(): Promise<ApiResponse> {
    return request.get(`/user/liveness?_t=${new Date().getTime()}`);
  },

  // 获取签到状态
  async getCheckInStatus(): Promise<ApiResponse> {
    return request.get('/user/checkedIn');
  },

  // 签到
  async signIn(): Promise<ApiResponse> {
    return request.post('/api/user/signIn', {});
  },

  // 领取昨日活跃奖励
  async claimYesterdayLivenessReward(): Promise<ApiResponse> {
    return request.get('/activity/yesterday-liveness-reward-api');
  },

  // 查询奖励状态
  async checkLivenessRewardStatus(): Promise<ApiResponse> {
    return request.get('/api/activity/is-collected-liveness');
  },

  // 获取最近注册用户
  async getRecentRegUsers(): Promise<ApiResponse> {
    return request.get('/api/user/recentReg');
  },

  // 转账
  async transfer(userName: string, amount: number, memo?: string): Promise<ApiResponse> {
    return request.post('/point/transfer', {
      userName,
      amount,
      memo,
    });
  },

  // 关注用户
  async followUser(followingId: number): Promise<ApiResponse> {
    return request.post('/follow/user', { followingId });
  },

  // 取消关注用户
  async unfollowUser(followingId: number): Promise<ApiResponse> {
    return request.post('/unfollow/user', { followingId });
  },

  // 上传文件
  async uploadFiles(files: FormData): Promise<ApiResponse> {
    return request.upload('/upload', files);
  },

  // 获取默认表情
  async getDefaultEmotions(): Promise<ApiResponse> {
    return request.get('/users/emotions');
  },

  // 获取表情包
  async getEmotionPack(gameId: string): Promise<ApiResponse> {
    return request.post('/api/cloud/get', { gameId });
  },

  // 同步表情包
  async syncEmotionPack(gameId: string, data: any): Promise<ApiResponse> {
    return request.post('/api/cloud/sync', {
      gameId,
      data,
    });
  },

  // 用户名联想
  async getUsernameSuggestions(name: string): Promise<ApiResponse> {
    return request.post('/users/names', { name });
  },
};
