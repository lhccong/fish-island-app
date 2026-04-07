import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      if (await shouldUseSecureStore()) {
        return await SecureStore.getItemAsync(key);
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
        await SecureStore.setItemAsync(key, value);
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
        await SecureStore.deleteItemAsync(key);
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
