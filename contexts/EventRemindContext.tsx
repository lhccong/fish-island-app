import { eventRemindApi } from '@/api/eventRemind';
import MessageNotificationPanel from '@/components/MessageNotificationPanel';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/utils/toast';
import { countUnread, processEventRemindList } from '@/utils/eventRemind';
import wsManager, { BACKEND_HOST_WS } from '@/utils/websocket';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const GLOBAL_WS_ID = 'global';

interface EventRemindContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  openPanel: () => void;
  closePanel: () => void;
  panelVisible: boolean;
}

const EventRemindContext = createContext<EventRemindContextValue | null>(null);

export function EventRemindProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await eventRemindApi.listMyPage({ current: 1, pageSize: 50 });
      if (res.code === 0 && res.data?.records) {
        const processed = processEventRemindList(res.data.records);
        setUnreadCount(countUnread(processed));
      }
    } catch {
      /* ignore */
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    refreshUnreadCount();
    const timer = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(timer);
  }, [isLoggedIn, refreshUnreadCount]);

  useEffect(() => {
    if (!isLoggedIn) {
      wsManager.close(GLOBAL_WS_ID);
      return;
    }

    const handleInfo = (data: { data?: string | { content?: string } }) => {
      const text =
        typeof data.data === 'string'
          ? data.data
          : data.data?.content || '您有新的系统消息';
      toast.info(text);
      refreshUnreadCount();
    };

    const handleError = (data: { data?: string }) => {
      toast.error(data.data || '发生错误');
    };

    wsManager.onMessageType('info', handleInfo);
    wsManager.onMessageType('error', handleError);

    wsManager.connect(BACKEND_HOST_WS, { connectionId: GLOBAL_WS_ID }).catch(() => {});

    return () => {
      wsManager.offMessageType('info', handleInfo);
      wsManager.offMessageType('error', handleError);
      wsManager.close(GLOBAL_WS_ID);
    };
  }, [isLoggedIn, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
      panelVisible,
      openPanel: () => setPanelVisible(true),
      closePanel: () => setPanelVisible(false),
    }),
    [unreadCount, refreshUnreadCount, panelVisible],
  );

  return (
    <EventRemindContext.Provider value={value}>
      {children}
      {isLoggedIn && (
        <MessageNotificationPanel
          visible={panelVisible}
          onClose={() => setPanelVisible(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </EventRemindContext.Provider>
  );
}

export function useEventRemind() {
  const ctx = useContext(EventRemindContext);
  if (!ctx) {
    throw new Error('useEventRemind must be used within EventRemindProvider');
  }
  return ctx;
}
