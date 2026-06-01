import { BASE_URL } from '@/constants/api';
import { isRemoteImageUri, preparePostImageForUpload } from '@/utils/imageUpload';
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
  momentsBgUrl?: string;
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

export interface UserUpdateMyRequest {
  userName?: string;
  userProfile?: string;
  userAvatar?: string;
  momentsBgUrl?: string;
}

export interface UserTitleVO {
  titleId: number;
  name?: string;
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

  /** 修改宠物名称（消耗 100 积分） */
  async updatePetName(name: string, petId?: number | string): Promise<ApiResponse> {
    return request.post('/api/pet/update/name', {
      name,
      ...(petId != null ? { petId } : {}),
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

  /** 更新当前登录用户个人信息 POST /api/user/update/my */
  async updateMyProfile(data: UserUpdateMyRequest): Promise<ApiResponse<boolean>> {
    return request.post('/api/user/update/my', data);
  },

  /** @deprecated 请使用 updateMyProfile */
  async updateUserProfile(data: UserUpdateMyRequest): Promise<ApiResponse<boolean>> {
    return this.updateMyProfile(data);
  },

  /** 获取可用称号列表 GET /api/user/title/list */
  async listAvailableTitles(): Promise<ApiResponse<UserTitleVO[]>> {
    return request.get('/api/user/title/list');
  },

  /** 设置当前佩戴称号 POST /api/user/title/set?titleId= */
  async setCurrentTitle(titleId: number | string): Promise<ApiResponse<boolean>> {
    return request.post('/api/user/title/set', {}, { params: { titleId } });
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

  /**
   * 上传图片到 MinIO（与 Web 端一致）
   * @param biz user_file 通用 | user_post 鱼小圈动态/评论配图
   */
  async uploadMinioImage(
    uri: string,
    fileName: string,
    biz: 'user_file' | 'user_post' = 'user_file',
    mimeType?: string,
  ): Promise<ApiResponse<string>> {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      heic: 'image/jpeg',
    };
    const fileType = mimeType || mimeMap[ext ?? ''] || 'image/jpeg';

    const formData = new FormData();
    formData.append('file', { uri, type: fileType, name: fileName } as any);

    const tokenName = await request.getTokenName();
    const tokenValue = await request.getTokenValue();
    const apiKey = await request.getApiKey();

    const headers: Record<string, string> = {};
    let url = `${BASE_URL}/api/file/minio/upload?biz=${biz}`;

    if (tokenName && tokenValue) {
      headers[tokenName] = tokenValue;
    } else if (apiKey) {
      url += `&apiKey=${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData as any,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    const json = (await response.json()) as ApiResponse<string>;
    if (json.code !== 0 || !json.data) {
      throw new Error(json.message || json.msg || '上传失败');
    }
    return json;
  },

  /** 聊天/表情包等通用图片 */
  async uploadImage(uri: string, fileName: string, mimeType?: string): Promise<ApiResponse<string>> {
    return this.uploadMinioImage(uri, fileName, 'user_file', mimeType);
  },

  /** 鱼小圈动态配图（biz=user_post，与 Web/utools 一致） */
  async uploadPostImage(
    uri: string,
    fileName: string,
    mimeType?: string,
  ): Promise<ApiResponse<string>> {
    if (isRemoteImageUri(uri)) {
      return this.uploadMinioImage(uri, fileName, 'user_post', mimeType);
    }
    const prepared = await preparePostImageForUpload(uri, fileName, mimeType);
    return this.uploadMinioImage(prepared.uri, prepared.fileName, 'user_post', prepared.mimeType);
  },

  /**
   * 新增收藏表情包
   * @param emoticonSrc - 表情包图片URL
   */
  async addEmoticonFavour(emoticonSrc: string): Promise<ApiResponse> {
    return request.postText('/api/emoticon_favour/add', emoticonSrc);
  },

  /**
   * 删除收藏表情包
   * @param id - 表情包收藏ID
   */
  async deleteEmoticonFavour(id: string | number): Promise<ApiResponse> {
    return request.post('/api/emoticon_favour/delete', { id: String(id) });
  },

  /**
   * 分页查询收藏表情包列表
   */
  async listEmoticonFavourByPage(params: {
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<{
    records: Array<{
      id: number;
      userId: number;
      emoticonSrc: string;
      createTime: string;
      updateTime: string;
    }>;
    total: number;
    current: number;
    size: number;
    pages: number;
  }>> {
    return request.post('/api/emoticon_favour/list/page', {
      current: Number(params.current) || 1,
      pageSize: Number(params.pageSize) || 20,
      sortField: params.sortField,
      sortOrder: params.sortOrder,
    });
  },
};
