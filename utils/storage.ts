import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** SecureStore 仅允许字母数字及 . - _ */
const SECURE_STORE_KEY_REGEX = /^[a-zA-Z0-9._-]+$/;

/** 将任意 storage key 转为 SecureStore 合法格式（保留内存/localStorage 仍用原 key） */
export function toSecureStoreKey(key: string): string {
  if (!key || SECURE_STORE_KEY_REGEX.test(key)) return key;
  const encoded = encodeURIComponent(key).replace(/%/g, '_');
  return `enc_${encoded}`;
}

// 内存存储回退（用于 Expo Go 等不支持 SecureStore 的环境）
const memoryStorage: Map<string, string> = new Map();

// 检查 SecureStore 是否可用
const isSecureStoreAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    await SecureStore.getItemAsync('__test__');
    return true;
  } catch {
    return false;
  }
};

let useSecureStore: boolean | null = null;

// 获取是否使用 SecureStore
const shouldUseSecureStore = async (): Promise<boolean> => {
  if (useSecureStore === null) {
    useSecureStore = await isSecureStoreAvailable();
  }
  return useSecureStore;
};

// 跨平台存储解决方案
// Web: 使用 localStorage
// Native (有 SecureStore): 使用 expo-secure-store
// Native (无 SecureStore): 使用内存存储

class Storage {
  private secureKey(key: string) {
    return toSecureStoreKey(key);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      if (await shouldUseSecureStore()) {
        const secureKey = this.secureKey(key);
        return await SecureStore.getItemAsync(secureKey);
      }
      return memoryStorage.get(key) || null;
    } catch (error) {
      console.error(`Storage getItem error for key ${key}:`, error);
      return memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      if (await shouldUseSecureStore()) {
        await SecureStore.setItemAsync(this.secureKey(key), value);
        return;
      }
      memoryStorage.set(key, value);
    } catch (error) {
      console.error(`Storage setItem error for key ${key}:`, error);
      memoryStorage.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      if (await shouldUseSecureStore()) {
        await SecureStore.deleteItemAsync(this.secureKey(key));
        return;
      }
      memoryStorage.delete(key);
    } catch (error) {
      console.error(`Storage removeItem error for key ${key}:`, error);
      memoryStorage.delete(key);
    }
  }
}

export const storage = new Storage();
