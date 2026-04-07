import { chatApi, ChatMessage, OnlineUser } from '@/api/chat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import wsManager, { BACKEND_HOST_WS } from '@/utils/websocket';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CONNECTION_ID = 'chatroom';

// 将新的 UserChatResponse 格式转换为现有格式（参考 utools）
const transformUserChatResponse = (user: any): any => {
  if (!user) return null;

  // 如果已经是旧格式，直接返回
  if (user.userName && user.userAvatarURL48) {
    return user;
  }

  // 转换新格式到旧格式
  let baseAvatar = user.avatar || '';

  // 确保头像 URL 是完整的
  if (baseAvatar && !baseAvatar.startsWith('http://') && !baseAvatar.startsWith('https://') && !baseAvatar.startsWith('data:')) {
    if (baseAvatar.startsWith('/')) {
      baseAvatar = 'https://api.yucoder.cn' + baseAvatar;
    } else {
      baseAvatar = 'https://api.yucoder.cn/' + baseAvatar;
    }
  }

  return {
    userName: user.name || user.id || '',
    userNickname: user.name || user.id || '',
    userAvatarURL: baseAvatar,
    userAvatarURL20: baseAvatar,
    userAvatarURL48: baseAvatar,
    userAvatarURL210: baseAvatar,
    id: user.id,
    avatar: user.avatar,
    level: user.level,
    points: user.points,
    isAdmin: user.isAdmin,
  };
};

// 转换 API 消息格式为统一格式（参考 utools transformRoomMessageVoToLegacy）
const transformRoomMessageVoToLegacy = (record: any): ChatMessage | null => {
  if (!record) return null;
  const message = record.messageWrapper?.message;
  if (!message) return null;

  const senderInfo = message.sender
    ? transformUserChatResponse(message.sender)
    : null;

  const fallbackAvatar = message.sender?.avatar || '';
  const fallbackName = message.sender?.name || message.sender?.id || '';

  const parseTimestamp = (value: any): number | undefined => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const timestamp =
    parseTimestamp(message.timestamp) ??
    parseTimestamp(message.sentAt) ??
    parseTimestamp(message.sentTime);

  const legacyMessage: any = {
    oId: message.id || record.id || `${record.roomId || 'room'}-${Date.now()}`,
    id: record.id,
    roomId: record.roomId ?? message.roomId ?? null,
    content: message.content ?? '',
    md: message.content ?? '',
    client: message.client || message.source || '',
    timestamp: message.timestamp || message.sentAt || message.sentTime || '',
    time: timestamp,
    isHistory: true,
  };

  if (senderInfo) {
    legacyMessage.userName = senderInfo.userName || fallbackName;
    legacyMessage.userNickname = senderInfo.userNickname || fallbackName;
    legacyMessage.userAvatarURL = senderInfo.userAvatarURL || fallbackAvatar;
    legacyMessage.userAvatarURL48 =
      senderInfo.userAvatarURL48 ||
      senderInfo.userAvatarURL ||
      fallbackAvatar;
  } else {
    legacyMessage.userName = fallbackName;
    legacyMessage.userNickname = fallbackName;
    legacyMessage.userAvatarURL = fallbackAvatar;
    legacyMessage.userAvatarURL48 = fallbackAvatar;
  }

  return legacyMessage;
};

// 转换实时 WebSocket 消息格式
const transformRealtimeChatMessage = (message: any): ChatMessage | null => {
  if (!message) return null;

  const record = {
    id: message.id,
    roomId: message.roomId,
    userId: message.sender?.id,
    messageWrapper: {
      message,
    },
  };

  const legacyMessage = transformRoomMessageVoToLegacy(record);

  if (!legacyMessage) return null;

  return {
    ...legacyMessage,
    type: 'chat',
    isHistory: false,
  };
};

// 处理消息内容中的图片标签
const processMessageContent = (content?: string): string => {
  if (!content || typeof content !== 'string') return ' ';
  // 转换 [img]url[/img] 为图片标记
  return content.replace(
    /\[img\]\s*([\s\S]*?)\s*\[\/img\]/gi,
    '[图片]'
  );
};

// 判断消息是否包含红包
const isRedPacket = (content?: string): boolean => {
  if (!content) return false;
  // 检查是否是 [redpacket]...[/redpacket] 格式
  if (/\[redpacket\]\s*[\s\S]*?\s*\[\/redpacket\]/i.test(content)) {
    return true;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed.msgType === 'redPacket';
  } catch {
    return false;
  }
};

// 解析红包信息
const parseRedPacket = (content?: string): any => {
  if (!content || typeof content !== 'string') return null;
  // 处理 [redpacket]...[/redpacket] 格式
  const redPacketMatch = content.match(/\[redpacket\]\s*([\s\S]*?)\s*\[\/redpacket\]/i);
  if (redPacketMatch) {
    const redPacketContent = String(redPacketMatch[1] || '').trim();
    try {
      const parsed = JSON.parse(redPacketContent);
      if (parsed.msgType === 'redPacket') {
        return parsed;
      }
    } catch {
      // 不是 JSON，是红包ID，返回默认结构
      return {
        msgType: 'redPacket',
        redPacketId: redPacketContent,
        msg: '红包',
        money: 0,
        count: 0,
        got: 0,
        type: 'random',
      };
    }
  }
  // 处理 JSON 格式
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

// 转换在线用户格式
const transformOnlineUsers = (users: any[]): OnlineUser[] => {
  if (!users || !Array.isArray(users)) return [];
  return users.map(user => {
    if (user.userName) {
      // 已经是旧格式
      return user;
    }
    // 新格式转换
    const transformed = transformUserChatResponse(user);
    return {
      userName: transformed?.userName || user.name || user.id || '',
      userNickname: transformed?.userNickname || user.name || user.id || '',
      userAvatarURL: transformed?.userAvatarURL || user.avatar || '',
      userOnlineFlag: true,
    };
  });
};

export default function ChatroomScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { userInfo: currentUser } = useUser();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  // 智能滚动状态
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastMessageCountRef = useRef(0); // 保存原始累计数，用于按比例缩减

  // 使用 ref 存储最新的 isAtBottom 状态，避免闭包问题
  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const previousScrollOffsetRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // 连接 WebSocket
  useEffect(() => {
    connectWebSocket();
    return () => {
      wsManager.close(CONNECTION_ID);
    };
  }, []);

  // 加载历史消息
  useEffect(() => {
    loadMessages();
  }, []);

  // 注册消息处理器
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      // 处理实时聊天消息
      if (data.type === 'chat' && data.data?.message) {
        const newMessage = transformRealtimeChatMessage(data.data.message);
        if (!newMessage) return;

        const isSelf = newMessage.userName === currentUser?.userName;
        // 在 setState 之前先记录当前是否在底部（参考 utools wasAtBottom）
        const wasAtBottom = isAtBottomRef.current;

        setMessages((prev) => {
          if (prev.some((m) => m.oId === newMessage.oId || m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // 用 requestAnimationFrame 等待本次渲染完成后再滚动（参考 utools nextTick + requestAnimationFrame）
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (wasAtBottom || isSelf) {
              // 在底部：平滑顶上去；自己发的：直接跳底部
              flatListRef.current?.scrollToEnd({ animated: wasAtBottom && !isSelf });
              setNewMessageCount(0);
              lastMessageCountRef.current = 0;
            } else {
              // 不在底部：累加新消息数，显示提示按钮
              setNewMessageCount((prev) => {
                const next = prev + 1;
                lastMessageCountRef.current = next;
                return next;
              });
            }
          });
        });
      } else if (data.type === 'online' && data.data) {
        const transformedUsers = transformOnlineUsers(data.data.users || []);
        setOnlineUsers(transformedUsers);
        setCurrentTopic(data.data.discussing || '');
      }
    };

    wsManager.onMessageType('chat', handleNewMessage);
    wsManager.onMessageType('online', handleNewMessage);

    return () => {
      wsManager.offMessageType('chat', handleNewMessage);
      wsManager.offMessageType('online', handleNewMessage);
    };
  }, [currentUser?.userName]);

  // 滚动到底部
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated });
      });
    }
  };

  // 检查是否在底部（参考 utools）
  const checkIfAtBottom = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceToBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const atBottom = distanceToBottom < 50;
    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;

    if (atBottom) {
      setNewMessageCount(0);
      lastMessageCountRef.current = 0;
    } else if (lastMessageCountRef.current > 0) {
      const maxDistance = 500;
      const ratio = Math.min(distanceToBottom / maxDistance, 1);
      const next = Math.max(Math.floor(lastMessageCountRef.current * ratio), 0);
      setNewMessageCount(next);
      if (next === 0) lastMessageCountRef.current = 0;
    }
  };

  const connectWebSocket = async () => {
    try {
      await wsManager.connect(BACKEND_HOST_WS, { connectionId: CONNECTION_ID });
      setIsConnected(true);
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      setIsConnected(false);
    }
  };

  const loadMessages = async (page = 1) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      if (isLoadingMoreRef.current) return;
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }

    try {
      const response = await chatApi.getChatMessages({
        current: page,
        pageSize: 20,
        sortOrder: 'desc',
      });

      if (response.code === 0 && response.data) {
        const records = response.data.records || [];
        const transformedMessages = records
          .map(transformRoomMessageVoToLegacy)
          .filter((msg: ChatMessage | null): msg is ChatMessage => msg !== null);

        if (page === 1) {
          const reversedMessages = transformedMessages.reverse();
          setMessages(reversedMessages);
          hasInitialScrolledRef.current = false;
          // 兜底：数据设置后延迟滚到底部，确保渲染完成
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            hasInitialScrolledRef.current = true;
          }, 100);
        } else {
          // 加载更多历史消息，插入到前面
          // onContentSizeChange 会检测高度差并恢复位置
          setMessages((prev) => [...transformedMessages.reverse(), ...prev]);
        }
        setHasMoreMessages(records.length === 20);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  const loadMoreMessages = () => {
    if (!isLoadingMoreRef.current && hasMoreMessages) {
      loadMessages(currentPage + 1);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      await chatApi.sendMessage(inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // 使用 userName 来判断是否是当前用户（参考 utools）
    const isSelf = item.userName === currentUser?.userName;
    const isRedPacketMessage = isRedPacket(item.content);

    return (
      <View style={[styles.messageRow, isSelf && styles.messageRowSelf]}>
        <Image
          source={{ uri: item.userAvatarURL48 || item.userAvatarURL || 'https://api.yucoder.cn/images/default-avatar.png' }}
          style={styles.avatar}
        />
        <View style={[styles.messageBubble, isSelf && styles.messageBubbleSelf]}>
          {/* 非自己的消息显示昵称 */}
          {!isSelf && item.userNickname && item.userNickname.trim() && (
            <Text style={[styles.senderName, { color: theme.text }]}>
              {item.userNickname}
            </Text>
          )}
          {isRedPacketMessage ? (
            <View style={styles.redPacketContainer}>
              <IconSymbol name="gift.fill" size={20} color="#FF6B6B" />
              <Text style={styles.redPacketText}>
                {(parseRedPacket(item.content)?.msg) || '红包'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.messageText, { color: isSelf ? '#fff' : theme.text }]}>
              {processMessageContent(item.content)}
            </Text>
          )}
          <Text style={[styles.messageTime, { color: isSelf ? 'rgba(255,255,255,0.7)' : theme.icon }]}>
            {item.time ? new Date(item.time).toLocaleTimeString() : ' '}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            聊天室
          </Text>
          <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#4CAF50' : '#FF6B6B' }]} />
        </View>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => setShowOnlineUsers(!showOnlineUsers)}
        >
          <IconSymbol name="person.2.fill" size={20} color={theme.tint} />
          <Text style={[styles.onlineCount, { color: theme.tint }]}>
            {onlineUsers.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 当前话题 */}
      {currentTopic && (
        <View style={[styles.topicBar, { backgroundColor: theme.card }]}>
          <IconSymbol name="tag.fill" size={14} color={theme.tint} />
          <Text style={[styles.topicText, { color: theme.text }]} numberOfLines={1}>
            话题: {currentTopic}
          </Text>
        </View>
      )}

      {/* 在线用户列表 */}
      {showOnlineUsers && (
        <View style={[styles.onlineUsersPanel, { backgroundColor: theme.card }]}>
          <Text style={[styles.onlineUsersTitle, { color: theme.text }]}>
            在线用户 ({onlineUsers.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.onlineUsersList}>
            {onlineUsers.map((user) => (
              <View key={user.userName} style={styles.onlineUserItem}>
                <Image
                  source={{ uri: user.userAvatarURL || 'https://api.yucoder.cn/images/default-avatar.png' }}
                  style={styles.onlineUserAvatar}
                />
                <Text style={[styles.onlineUserName, { color: theme.text }]} numberOfLines={1}>
                  {user.userNickname || user.userName || ' '}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => {
          const baseKey = item.oId || item.id || '';
          const timeKey = item.time || item.timestamp || '';
          const userKey = item.userName || '';
          return `${baseKey}-${timeKey}-${userKey}-${index}`;
        }}
        contentContainerStyle={styles.messagesList}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingMore}
            onRefresh={() => {
              if (!isLoadingMoreRef.current && hasMoreMessages) {
                loadMessages(currentPage + 1);
              }
            }}
            tintColor={theme.tint}
          />
        }
        onScroll={checkIfAtBottom}
        scrollEventThrottle={16}
        onContentSizeChange={(_, newHeight) => {
          if (!hasInitialScrolledRef.current && newHeight > 0) {
            // 首次加载，滚到底部
            hasInitialScrolledRef.current = true;
            flatListRef.current?.scrollToEnd({ animated: false });
          } else if (isLoadingMoreRef.current || isLoadingMore) {
            // 加载更多后，按新增高度差恢复位置，保持用户视角不跳动
            const diff = newHeight - previousScrollHeightRef.current;
            if (diff > 0 && previousScrollHeightRef.current > 0) {
              flatListRef.current?.scrollToOffset({
                offset: previousScrollOffsetRef.current + diff,
                animated: false,
              });
            }
          }
          previousScrollHeightRef.current = newHeight;
        }}
        onScrollBeginDrag={(e) => {
          // 记录开始拖动时的 offset，供加载更多后恢复用
          previousScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        ListHeaderComponent={
          isLoadingMore ? (
            <ActivityIndicator style={styles.loadingMore} color={theme.tint} />
          ) : null
        }
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {/* 新消息提示按钮（参考 utools） */}
      {newMessageCount > 0 && !isAtBottom && (
        <TouchableOpacity
          style={styles.newMessageNotification}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        >
          <IconSymbol name="chevron.down" size={16} color="#fff" />
          <Text style={styles.newMessageNotificationText}>
            {newMessageCount} 条新消息
          </Text>
        </TouchableOpacity>
      )}

      {/* 输入框 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            placeholder="输入消息..."
            placeholderTextColor={theme.icon}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? theme.tint : theme.icon }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <IconSymbol name="arrow.up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  connectionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineCount: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  topicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topicText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  onlineUsersPanel: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  onlineUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  onlineUsersList: {
    flexDirection: 'row',
  },
  onlineUserItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 60,
  },
  onlineUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
  },
  onlineUserName: {
    fontSize: 11,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageRowSelf: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 4,
  },
  messageBubbleSelf: {
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.5,
  },
  redPacketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  redPacketText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 10,
  },
  newMessageNotification: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newMessageNotificationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
});
