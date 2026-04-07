import { userApi, UserInfo } from '@/api/user';
import { request } from '@/utils/request';
import { storage } from '@/utils/storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// 存储键名
const USER_INFO_KEY = 'fishpi_user_info';
const ACCOUNTS_KEY = 'fishpi_accounts';

interface UserContextType {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  switchAccount: (account: UserInfo) => Promise<void>;
  getAccounts: () => Promise<UserInfo[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查登录状态
  const checkLoginStatus = useCallback(async () => {
    try {
      const tokenName = await request.getTokenName();
      const tokenValue = await request.getTokenValue();
      const apiKey = await request.getApiKey();
      const storedUserInfo = await storage.getItem(USER_INFO_KEY);

      if ((tokenName && tokenValue) || apiKey) {
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          setUserInfo(parsedUserInfo);
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  // 登录
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);

      // 判断输入的是邮箱还是账号
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
      let res;

      if (isEmail) {
        // 邮箱登录
        res = await userApi.userEmailLogin(username, password);
      } else {
        // 账号登录
        res = await userApi.userLogin(username, password);
      }

      if (res.code === 0 && res.data) {
        const loginData = res.data;

        // 保存 token 信息
        if (loginData.saTokenInfo) {
          await request.setToken(
            loginData.saTokenInfo.tokenName,
            loginData.saTokenInfo.tokenValue
          );
        }

        // 保存用户信息
        await storage.setItem(USER_INFO_KEY, JSON.stringify(loginData));

        // 保存账号到账号列表
        const accountsStr = await storage.getItem(ACCOUNTS_KEY);
        const accounts: UserInfo[] = accountsStr ? JSON.parse(accountsStr) : [];
        const existingAccountIndex = accounts.findIndex(
          (account) => account.userName === loginData.userName
        );

        const accountData: UserInfo = {
          ...loginData,
          tokenName: loginData.saTokenInfo?.tokenName,
          tokenValue: loginData.saTokenInfo?.tokenValue,
        };

        if (existingAccountIndex === -1) {
          accounts.push(accountData);
        } else {
          accounts[existingAccountIndex] = accountData;
        }
        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

        setUserInfo(loginData);
        setIsLoggedIn(true);

        return { success: true, message: '登录成功' };
      } else {
        return { success: false, message: res.message || res.msg || '登录失败' };
      }
    } catch (error: any) {
      const message = error.message || '登录失败';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await request.clearToken();
      await request.clearApiKey();
      await storage.removeItem(USER_INFO_KEY);
      setUserInfo(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('登出失败:', error);
    }
  }, []);

  // 刷新用户信息
  const refreshUserInfo = useCallback(async () => {
    try {
      const res = await userApi.getCurrentUser();
      if (res.code === 0 && res.data) {
        const newUserInfo = { ...userInfo, ...res.data };
        setUserInfo(newUserInfo);
        await storage.setItem(USER_INFO_KEY, JSON.stringify(newUserInfo));
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  }, [userInfo]);

  // 切换账号
  const switchAccount = useCallback(async (account: UserInfo) => {
    // 检查是否有 token 或 apiKey
    const hasToken = account.saTokenInfo?.tokenName && account.saTokenInfo?.tokenValue;
    const hasTokenValue = account.tokenValue;
    const hasApiKey = account.apiKey;

    if (!account || (!hasToken && !hasTokenValue && !hasApiKey)) {
      console.error('切换账号失败：缺少认证信息');
      return;
    }

    // 设置认证信息（优先使用 token）
    if (hasToken) {
      await request.setToken(account.saTokenInfo!.tokenName, account.saTokenInfo!.tokenValue);
    } else if (hasTokenValue && account.tokenValue) {
      const tokenName = account.tokenName || 'fish-dog-token';
      await request.setToken(tokenName, account.tokenValue);
    } else if (hasApiKey && account.apiKey) {
      await request.setApiKey(account.apiKey);
    }

    setUserInfo(account);
    await storage.setItem(USER_INFO_KEY, JSON.stringify(account));
    setIsLoggedIn(true);
  }, []);

  // 获取账号列表
  const getAccounts = useCallback(async (): Promise<UserInfo[]> => {
    try {
      const accountsStr = await storage.getItem(ACCOUNTS_KEY);
      return accountsStr ? JSON.parse(accountsStr) : [];
    } catch {
      return [];
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        isLoggedIn,
        userInfo,
        loading,
        login,
        logout,
        refreshUserInfo,
        switchAccount,
        getAccounts,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
