// WebSocket 管理器 - 参考 utools 的 websocket.js 实现
import { request } from '@/utils/request';

// WebSocket 后端地址（与 utools 完全一致）
export const BACKEND_HOST_WS = 'wss://api.yucoder.cn/ws/?token=';

// 简单的事件发射器实现
class SimpleEventEmitter {
  private eventHandlers: Map<string, Set<Function>> = new Map();

  on(event: string, handler: Function, connectionId?: string) {
    const key = connectionId ? `${event}:${connectionId}` : event;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key)!.add(handler);
  }

  off(event: string, handler: Function, connectionId?: string) {
    const key = connectionId ? `${event}:${connectionId}` : event;
    const handlers = this.eventHandlers.get(key);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  protected emit(event: string, data?: any, connectionId?: string) {
    // 触发特定连接的消息事件
    const specificKey = `${event}:${connectionId}`;
    const specificHandlers = this.eventHandlers.get(specificKey);
    specificHandlers?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理消息时出错:`, error);
      }
    });

    // 触发全局消息事件
    const globalHandlers = this.eventHandlers.get(event);
    globalHandlers?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理消息时出错:`, error);
      }
    });
  }
}

class WebSocketManager extends SimpleEventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting: Map<string, boolean> = new Map();
  private isManualClose: Map<string, boolean> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isMessageProcessingPaused: Map<string, boolean> = new Map();
  private isWindowFocused: Map<string, boolean> = new Map();
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private notificationIntervals: Map<string, number> = new Map();
  private connectionOptions: Map<string, any> = new Map();
  private originalUrls: Map<string, string> = new Map();

  constructor() {
    super();
    // 监听窗口焦点变化（仅在 web 环境）
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.connections.forEach((_, connectionId) => {
          this.isWindowFocused.set(connectionId, true);
        });
      });

      window.addEventListener('blur', () => {
        this.connections.forEach((_, connectionId) => {
          this.isWindowFocused.set(connectionId, false);
        });
      });
    }
  }

  /**
   * 连接到 WebSocket 服务器
   * @param url WebSocket 服务器地址
   * @param options 连接选项
   * @returns Promise<WebSocket>
   */
  async connect(url: string, options: { connectionId?: string; params?: Record<string, any> } = {}): Promise<WebSocket> {
    const connectionId = options.connectionId || url;

    if (this.isConnecting.get(connectionId)) {
      return Promise.reject(new Error('正在连接中...'));
    }

    const existingWs = this.connections.get(connectionId);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return Promise.resolve(existingWs);
    }

    this.isConnecting.set(connectionId, true);
    this.isManualClose.set(connectionId, false);
    this.isMessageProcessingPaused.set(connectionId, false);
    this.isWindowFocused.set(connectionId, document?.hasFocus?.() ?? true);

    // 保存原始URL和选项，用于重连
    this.originalUrls.set(connectionId, url);
    this.connectionOptions.set(connectionId, options);

    // 如果URL是新的后端地址格式，使用token连接
    let websocketUrl = url;
    if (url === BACKEND_HOST_WS || url.startsWith(BACKEND_HOST_WS)) {
      const token = await request.getTokenValue();
      if (token) {
        websocketUrl = `${BACKEND_HOST_WS}${token}`;
      } else {
        return Promise.reject(new Error('未找到token，无法建立连接'));
      }
    } else {
      // 旧的连接方式：如果URL已经包含了apiKey，直接使用
      // 如果URL不包含apiKey，则添加
      if (!url.includes('apiKey=')) {
        const apiKey = await request.getApiKey();
        if (apiKey) {
          websocketUrl = `${url}${url.includes('?') ? '&' : '?'}apiKey=${apiKey}`;
        }
      }

      // 添加额外的参数
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (!websocketUrl.includes(`${key}=`)) {
            websocketUrl = `${websocketUrl}${
              websocketUrl.includes('?') ? '&' : '?'
            }${key}=${value}`;
          }
        });
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(websocketUrl);
        this.connections.set(connectionId, ws);

        ws.onopen = () => {
          console.log(`WebSocket 连接已建立: ${connectionId}`);
          this.isConnecting.set(connectionId, false);
          this.reconnectAttempts.set(connectionId, 0);

          // 清除重连定时器
          const timer = this.reconnectTimers.get(connectionId);
          if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(connectionId);
          }

          // 如果是新的后端地址，连接成功后发送登录消息
          if (url === BACKEND_HOST_WS || url.startsWith(BACKEND_HOST_WS)) {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 1, // 登录连接
              }));
            } else {
              console.error('WebSocket连接失败');
            }
          }

          // 启动心跳机制（仅对新后端地址）
          if (url === BACKEND_HOST_WS || url.startsWith(BACKEND_HOST_WS)) {
            this.startHeartbeat(connectionId);
          }

          resolve(ws);
        };

        ws.onclose = () => {
          console.log(`WebSocket 连接已关闭: ${connectionId}`);
          this.isConnecting.set(connectionId, false);

          // 清除心跳定时器
          if (this.heartbeatIntervals.has(connectionId)) {
            clearInterval(this.heartbeatIntervals.get(connectionId)!);
            this.heartbeatIntervals.delete(connectionId);
          }

          // 清除通知定时器
          if (this.notificationIntervals.has(connectionId)) {
            const intervalId = this.notificationIntervals.get(connectionId);
            this.stopNotification(intervalId ?? null);
            this.notificationIntervals.delete(connectionId);
          }

          // 只有在非手动关闭的情况下才进行重连
          if (!this.isManualClose.get(connectionId)) {
            // 使用原始URL和选项进行重连，这样可以在重连时重新获取token
            const originalUrl = this.originalUrls.get(connectionId) || url;
            const originalOptions = this.connectionOptions.get(connectionId) || options;
            this.handleReconnect(originalUrl, originalOptions, connectionId);
          }
        };

        ws.onerror = (error) => {
          console.error(`WebSocket 错误: ${connectionId}`, error);
          this.isConnecting.set(connectionId, false);
          console.error('连接发生错误');
          reject(error);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // 如果消息处理被暂停，直接丢弃聊天消息
            if (this.isMessageProcessingPaused.get(connectionId)) {
              // 只暂停聊天消息，其他类型的消息（如系统消息、错误消息等）仍然处理
              if (data.type === 'chat') {
                return; // 直接丢弃，不存储
              }
            }

            // 调用按类型分组的消息处理器
            const handlers = this.messageHandlers.get(data.type) || new Set();
            handlers.forEach((handler) => {
              try {
                handler(data);
              } catch (error) {
                console.error('处理消息时出错:', error);
              }
            });

            // 如果是聊天消息且窗口未激活，则触发通知
            if (data.type === 'chat' && !this.isWindowFocused.get(connectionId)) {
              const existingInterval = this.notificationIntervals.get(connectionId);
              this.stopNotification(existingInterval ?? null);
              const interval = this.startNotification(data.data?.message?.content || '新消息');
              if (interval) {
                this.notificationIntervals.set(connectionId, interval);
              }
            }

            // 触发原有的消息处理逻辑
            this.handleMessage(data, connectionId);
          } catch (e) {
            console.error('消息解析错误:', e);
          }
        };
      } catch (error) {
        this.isConnecting.set(connectionId, false);
        reject(error);
      }
    });
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(url: string, options: { connectionId?: string }, connectionId: string) {
    if (this.isManualClose.get(connectionId)) {
      return;
    }

    const attempts = this.reconnectAttempts.get(connectionId) || 0;
    if (attempts < this.maxReconnectAttempts) {
      // 指数退避
      const timeout = Math.min(1000 * Math.pow(2, attempts), 10000);

      const existingTimer = this.reconnectTimers.get(connectionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        this.reconnectAttempts.set(connectionId, attempts + 1);
        console.log(`尝试重连 ${connectionId} (${attempts + 1}/${this.maxReconnectAttempts})...`);
        this.connect(url, options);
      }, timeout);

      this.reconnectTimers.set(connectionId, timer);
    } else {
      console.log(`达到最大重连次数，停止重连: ${connectionId}`);
    }
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat(connectionId: string) {
    this.stopHeartbeat(connectionId);

    const interval = setInterval(() => {
      const ws = this.connections.get(connectionId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 4 }));
      }
    }, 25000);

    this.heartbeatIntervals.set(connectionId, interval);
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat(connectionId: string) {
    const interval = this.heartbeatIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionId);
    }
  }

  /**
   * 启动通知
   */
  private startNotification(content: string): number | null {
    // 在 React Native 中使用 console.log 或自定义通知
    console.log('新消息通知:', content);
    return Date.now();
  }

  /**
   * 停止通知
   */
  private stopNotification(intervalId: number | null) {
    // 占位方法
  }

  /**
   * 暂停消息处理
   */
  pauseMessageProcessing(connectionId: string) {
    this.isMessageProcessingPaused.set(connectionId, true);
  }

  /**
   * 恢复消息处理
   */
  resumeMessageProcessing(connectionId: string) {
    this.isMessageProcessingPaused.set(connectionId, false);
  }

  /**
   * 发送消息
   */
  send(data: any, connectionId: string) {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log(`发送消息到 ${connectionId}:`, data);
      ws.send(data);
    } else {
      console.error(`WebSocket 未连接: ${connectionId}`);
    }
  }

  /**
   * 关闭连接
   */
  close(connectionId?: string) {
    if (connectionId) {
      this.isManualClose.set(connectionId, true);

      const timer = this.reconnectTimers.get(connectionId);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(connectionId);
      }

      // 清除心跳定时器
      if (this.heartbeatIntervals.has(connectionId)) {
        clearInterval(this.heartbeatIntervals.get(connectionId)!);
        this.heartbeatIntervals.delete(connectionId);
      }

      // 清除通知定时器
      if (this.notificationIntervals.has(connectionId)) {
        const intervalId = this.notificationIntervals.get(connectionId);
        this.stopNotification(intervalId ?? null);
        this.notificationIntervals.delete(connectionId);
      }
      // 清除保存的连接信息
      this.originalUrls.delete(connectionId);
      this.connectionOptions.delete(connectionId);
      const ws = this.connections.get(connectionId);
      if (ws) {
        ws.close();
        this.connections.delete(connectionId);
      }
    } else {
      // 关闭所有连接
      this.connections.forEach((ws, id) => {
        this.isManualClose.set(id, true);

        // 清除重连定时器
        if (this.reconnectTimers.has(id)) {
          clearTimeout(this.reconnectTimers.get(id)!);
          this.reconnectTimers.delete(id);
        }

        // 清除心跳定时器
        if (this.heartbeatIntervals.has(id)) {
          clearInterval(this.heartbeatIntervals.get(id)!);
          this.heartbeatIntervals.delete(id);
        }

        // 清除通知定时器
        if (this.notificationIntervals.has(id)) {
          const intervalId = this.notificationIntervals.get(id);
          this.stopNotification(intervalId ?? null);
          this.notificationIntervals.delete(id);
        }

        // 清除保存的连接信息
        this.originalUrls.delete(id);
        this.connectionOptions.delete(id);
        ws.close();
      });
      this.connections.clear();
      this.originalUrls.clear();
      this.connectionOptions.clear();
    }
  }

  /**
   * 注册按类型分组的消息处理器
   */
  onMessageType(type: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  /**
   * 移除按类型分组的消息处理器
   */
  offMessageType(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: any, connectionId: string) {
    // 触发特定类型的处理器
    if (data.type) {
      const handlers = this.messageHandlers.get(data.type);
      handlers?.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('处理消息时出错:', error);
        }
      });
    }

    // 触发事件
    this.emit('message', data, connectionId);
  }

  /**
   * 获取连接状态
   */
  isConnected(connectionId: string): boolean {
    const ws = this.connections.get(connectionId);
    return ws?.readyState === WebSocket.OPEN;
  }
}

// 创建单例实例
const wsManager = new WebSocketManager();

export default wsManager;
