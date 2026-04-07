import { API_CONFIG } from '@/constants/api';
import { storage } from '@/utils/storage';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// 存储键名
const TOKEN_NAME_KEY = 'tokenName';
const TOKEN_VALUE_KEY = 'tokenValue';
const API_KEY_STORAGE_KEY = 'fishpi_api_key';

class Request {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create(API_CONFIG);

    // 请求拦截器
    this.instance.interceptors.request.use(
      async (config) => {
        // 优先使用新的 token 认证方式
        const tokenName = await this.getTokenName();
        const tokenValue = await this.getTokenValue();

        if (tokenName && tokenValue) {
          // 使用新的 token 认证，添加到请求头
          config.headers[tokenName] = tokenValue;
        } else {
          // 回退到旧的 apiKey 方式（保持兼容性）
          const apiKey = await this.getApiKey();
          if (apiKey) {
            // 检查是否是文件上传请求
            const isFileUpload =
              config.headers['Content-Type'] === 'multipart/form-data';

            if (isFileUpload) {
              // 文件上传请求，将apiKey添加到URL参数中
              config.url = `${config.url}${
                config.url?.includes('?') ? '&' : '?'
              }apiKey=${apiKey}`;
            } else if (config.method === 'get') {
              // GET 请求将 apiKey 添加到 URL 参数中
              config.params = {
                ...config.params,
                apiKey: apiKey,
              };
            } else {
              // POST/PUT/DELETE 等请求
              // 如果 data 是字符串，将 apiKey 添加到 URL 参数中
              // 如果 data 是对象，将 apiKey 添加到请求体中
              if (typeof config.data === 'string') {
                // 字符串类型的 body，将 apiKey 添加到 URL 参数中
                config.url = `${config.url}${
                  config.url?.includes('?') ? '&' : '?'
                }apiKey=${apiKey}`;
              } else {
                // 对象类型的 body，将 apiKey 添加到请求体中
                config.data = {
                  ...config.data,
                  apiKey: apiKey,
                };
              }
            }
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        const res = response.data;
        console.log('API响应:', res);

        // 处理认证失败的情况（token 或 API Key 无效）
        if (res.code === -1 || res.code === 401) {
          if (res.msg === 'Invalid API Key' || res.msg?.includes('API Key') ||
              res.msg?.includes('未登录') || res.msg?.includes('token')) {
            this.clearApiKey();
            this.clearToken();
            // 触发登录失效事件
            // 在 React Native 中使用 EventEmitter 或回调处理
          }
        }

        // 返回响应数据，让调用方处理错误
        return res;
      },
      (error) => {
        console.error('API错误:', error);
        return Promise.reject(error);
      }
    );
  }

  // 获取 Token Name
  async getTokenName(): Promise<string | null> {
    try {
      return await storage.getItem(TOKEN_NAME_KEY);
    } catch {
      return null;
    }
  }

  // 获取 Token Value
  async getTokenValue(): Promise<string | null> {
    try {
      return await storage.getItem(TOKEN_VALUE_KEY);
    } catch {
      return null;
    }
  }

  // 设置 Token
  async setToken(tokenName: string, tokenValue: string): Promise<void> {
    try {
      await storage.setItem(TOKEN_NAME_KEY, tokenName);
      await storage.setItem(TOKEN_VALUE_KEY, tokenValue);
    } catch (error) {
      console.error('保存Token失败:', error);
    }
  }

  // 清除 Token
  async clearToken(): Promise<void> {
    try {
      await storage.removeItem(TOKEN_NAME_KEY);
      await storage.removeItem(TOKEN_VALUE_KEY);
    } catch (error) {
      console.error('清除Token失败:', error);
    }
  }

  // 获取 API Key（保持兼容性）
  async getApiKey(): Promise<string | null> {
    try {
      return await storage.getItem(API_KEY_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  // 设置 API Key（保持兼容性）
  async setApiKey(apiKey: string): Promise<void> {
    try {
      await storage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } catch (error) {
      console.error('保存API Key失败:', error);
    }
  }

  // 清除 API Key（保持兼容性）
  async clearApiKey(): Promise<void> {
    try {
      await storage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('清除API Key失败:', error);
    }
  }

  // GET 请求
  async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    return this.instance.get(path, { params });
  }

  // POST 请求
  async post<T = any>(path: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<T> {
    return this.instance.post(path, data, config);
  }

  // POST 请求（text/plain Content-Type）
  async postText<T = any>(path: string, data: string = ''): Promise<T> {
    // 使用 text/plain Content-Type 发送纯字符串
    return this.instance.post(path, data, {
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      transformRequest: [
        // 移除默认的 transformRequest，直接返回字符串
        (data) => {
          // 如果 data 是字符串，直接返回（不添加引号）
          // 如果 data 是其他类型，转换为字符串
          return typeof data === 'string' ? data : String(data);
        },
      ],
    });
  }

  // PUT 请求
  async put<T = any>(path: string, data: any = {}): Promise<T> {
    return this.instance.put(path, data);
  }

  // DELETE 请求
  async delete<T = any>(path: string): Promise<T> {
    return this.instance.delete(path);
  }

  // 文件上传
  async upload<T = any>(path: string, files: FormData): Promise<T> {
    return this.instance.post(path, files, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

export const request = new Request();
