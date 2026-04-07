import { request } from '@/utils/request';

// 聊天消息类型（参考 utools 数据结构）
export interface ChatMessage {
  oId?: string;
  id?: string;
  content?: string;
  md?: string;
  time?: string | number;
  timestamp?: string;
  type?: 'chat' | 'system' | 'redPacket' | 'image' | 'time-separator';
  isDeleted?: boolean;
  sysMetal?: any;
  // 发送者信息（utools 格式）
  userName?: string;
  userNickname?: string;
  userAvatarURL?: string;
  userAvatarURL20?: string;
  userAvatarURL48?: string;
  userAvatarURL210?: string;
  userPoint?: number;
  userIntro?: string;
  // 旧格式兼容字段
  senderUserName?: string;
  senderAvatar?: string;
  senderId?: number;
  receiverUserName?: string;
  receiverAvatar?: string;
  receiverId?: number;
  // 其他字段
  client?: string;
  roomId?: number;
  isHistory?: boolean;
  isSelf?: boolean;
  quotedMessage?: any;
  messageWrapper?: any;
  rawMessage?: any;
}

// 私信列表项
export interface PrivateChatItem {
  user_session: string;
  senderUserName: string;
  receiverUserName: string;
  senderAvatar: string;
  receiverAvatar: string;
  senderId: number;
  receiverId: number;
  preview: string;
  unreadCount: number;
  receiverOnlineFlag: boolean;
}

// 在线用户
export interface OnlineUser {
  userName: string;
  userNickname?: string;
  userAvatarURL?: string;
  userOnlineFlag?: boolean;
}

// 红包信息
export interface RedPacket {
  msgType: 'redPacket';
  redPacketId: string;
  count: number;
  msg: string;
  senderName: string;
  senderAvatar: string;
  type: 'random' | 'average' | 'specify' | 'heartbeat' | 'rockPaperScissors';
  recivers?: string[];
  gesture?: number;
}

// API 响应类型
export interface ChatMessageResponse {
  code: number;
  data?: {
    records: ChatMessage[];
    total: number;
    size: number;
    current: number;
    pages: number;
  };
  msg?: string;
}

export const chatApi = {
  // 获取聊天节点
  getChatNode() {
    return request.get('/chat-room/node/get');
  },

  // 获取聊天消息
  getChatMessages(params: {
    current?: number;
    pageSize?: number;
    roomId?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      current = 1,
      pageSize = 20,
      roomId = -1,
      sortField = 'id',
      sortOrder = 'desc',
    } = params;

    return request.post('/api/chat/message/page/vo', {
      current,
      pageSize,
      roomId,
      sortField,
      sortOrder,
    });
  },

  // 获取默认表情
  getDefaultEmotions() {
    return request.get('/users/emotions');
  },

  // 获取表情包
  getEmotionPack(gameId: string) {
    return request.post('/api/cloud/get', { gameId });
  },

  // 发送消息
  sendMessage(content: string) {
    return request.post('/chat-room/send', {
      content,
      client: 'fish-island-app',
    });
  },

  // 撤回消息
  revokeMessage(oId: string) {
    return request.delete(`/chat-room/revoke/${oId}`);
  },

  // 打开红包
  openRedPacket(oId: string, gesture?: number) {
    return request.post('/chat-room/red-packet/open', { oId, gesture });
  },

  // 抢红包
  grabRedPacket(redPacketId: string) {
    return request.instance.post('/api/redpacket/grab', null, {
      params: { redPacketId },
    });
  },

  // 创建红包
  createRedPacket(body: any) {
    return request.post('/api/redpacket/create', body);
  },

  // 获取红包详情
  getRedPacketDetail(redPacketId: string) {
    return request.get('/api/redpacket/detail', { redPacketId });
  },

  // 获取红包抢购记录
  getRedPacketRecords(redPacketId: string) {
    return request.get('/api/redpacket/records', { redPacketId });
  },

  // 获取私信列表
  getPrivateMessages() {
    return request.get('/chat/get-list');
  },

  // 发送私信
  sendPrivateMessage(userName: string, content: string) {
    return request.post('/chat/send', {
      userName,
      content,
    });
  },

  // 获取私信详情
  getPrivateMessageDetail(toUser: string, page = 1, pageSize = 20) {
    return request.get('/chat/get-message', { toUser, page, pageSize });
  },

  // 获取未读私信消息
  getUnreadMessages() {
    return request.get('/chat/has-unread');
  },

  // 标记私信为已读
  markAsRead(fromUser: string) {
    return request.get('/chat/mark-as-read', { fromUser });
  },

  // 获取在线用户列表
  getOnlineUserList(options: any = {}) {
    return request.get('/api/chat/online/user', options);
  },

  // 上传图片
  async uploadImage(uri: string, fileName: string) {
    const formData = new FormData();

    // 根据文件扩展名推断 MIME 类型
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const fileType = mimeMap[ext ?? ''] ?? 'image/jpeg';

    // React Native 特定的文件对象格式
    formData.append('file', { uri, type: fileType, name: fileName } as any);

    // 获取认证信息
    const tokenName = await request.getTokenName();
    const tokenValue = await request.getTokenValue();
    const apiKey = await request.getApiKey();

    // 构建请求头（不手动设置 Content-Type，让 fetch 自动附加 boundary）
    const headers: Record<string, string> = {};

    // 构建 URL
    let url = 'https://api.yucoder.cn/api/file/minio/upload?biz=user_file';

    if (tokenName && tokenValue) {
      // 优先使用 token 认证
      headers[tokenName] = tokenValue;
    } else if (apiKey) {
      // 回退到 apiKey
      url += `&apiKey=${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    return await response.json();
  },
};
