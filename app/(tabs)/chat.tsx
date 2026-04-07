import { chatApi, ChatMessage, OnlineUser } from '@/api/chat';
import ImageMessage from '@/components/ImageMessage';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import wsManager, { BACKEND_HOST_WS } from '@/utils/websocket';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

// 判断消息是否包含图片
const isImageMessage = (content?: string): boolean => {
  if (!content) return false;
  // 检查是否是 [img]url[/img] 格式
  if (/\[img\]\s*[\s\S]*?\s*\[\/img\]/i.test(content)) {
    return true;
  }
  return false;
};

// 解析图片URL
const parseImageUrls = (content?: string): string[] => {
  if (!content) return [];
  const urls: string[] = [];
  // 匹配 [img]url[/img] 格式
  const matches = content.match(/\[img\]\s*([\s\S]*?)\s*\[\/img\]/gi);
  if (matches) {
    matches.forEach(match => {
      const urlMatch = match.match(/\[img\]\s*([\s\S]*?)\s*\[\/img\]/i);
      if (urlMatch && urlMatch[1]) {
        urls.push(urlMatch[1].trim());
      }
    });
  }
  return urls;
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
  const tabBarHeight = useBottomTabBarHeight();

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
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // 智能滚动状态
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastMessageCountRef = useRef(0); // 保存原始累计数，用于按比例缩减

  // 使用 ref 存储最新的 isAtBottom 状态，避免闭包问题
  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const currentPageRef = useRef(1);

  const [listOpacity, setListOpacity] = useState(1);
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

  // 获取在线用户列表（参考 utools：挂载时拉一次 + 每 30s 轮询）
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await chatApi.getOnlineUserList();
        if (response.code === 0 && Array.isArray(response.data)) {
          setOnlineUsers(transformOnlineUsers(response.data));
        }
      } catch (error) {
        console.error('获取在线用户失败:', error);
      }
    };
    fetchOnlineUsers();
    const timer = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(timer);
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

  // 检查是否在底部，同时处理滚到顶部加载更多
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

    // 滚到顶部时加载历史消息（参考 utools scrollTop === 0）
    if (contentOffset.y <= 0 && !isLoadingMoreRef.current && hasMoreMessages) {
      loadMessages(currentPageRef.current + 1);
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
        } else {
          // 加载更多历史消息，插入到前面
          const newMsgs = transformedMessages.reverse();
          const insertCount = newMsgs.length;
          // 先隐藏列表避免闪烁，插入后跳回原位再显示
          setListOpacity(0);
          setMessages((prev) => [...newMsgs, ...prev]);
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: insertCount,
              animated: false,
              viewPosition: 0,
            });
            setListOpacity(1);
          }, 50);
        }
        setHasMoreMessages(records.length === 20);
        setCurrentPage(page);
        currentPageRef.current = page;
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

  const sendMessage = () => {
    const content = inputText.trim();
    if (!content) return;

    // 乐观更新：立即追加到本地消息列表（参考 utools）
    const optimisticMsg: ChatMessage = {
      oId: `optimistic-${Date.now()}`,
      content,
      md: content,
      userName: currentUser?.userName || '',
      userNickname: currentUser?.userNickname || currentUser?.userName || '',
      userAvatarURL: currentUser?.userAvatar || '',
      userAvatarURL48: currentUser?.userAvatar || '',
      time: Date.now(),
      type: 'chat',
      isHistory: false,
      isSelf: true,
    };

    setInputText('');
    setMessages((prev) => [...prev, optimisticMsg]);

    // 发送后滚到底部，用 setTimeout 确保渲染完成后再滚动
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // 通过 WebSocket 发送消息（参考 utools type:2 格式，message 为完整对象）
    try {
      const now = Date.now();
      const message = {
        id: `${now}`,
        content,
        sender: {
          id: String(currentUser?.id ?? ''),
          name: currentUser?.userName || '',
          avatar: currentUser?.userAvatar || '',
          level: currentUser?.level || 1,
          points: currentUser?.points || 0,
          isAdmin: currentUser?.userRole === 'admin',
        },
        timestamp: new Date(now).toISOString(),
      };
      const messageData = JSON.stringify({
        type: 2,
        userId: -1,
        data: {
          type: 'chat',
          content: {
            message,
          },
        },
      });
      wsManager.send(messageData, CONNECTION_ID);
    } catch (error) {
      console.error('发送消息失败:', error);
      // 发送失败时移除乐观消息，恢复输入框内容
      setMessages((prev) => prev.filter((m) => m.oId !== optimisticMsg.oId));
      setInputText(content);
    }
  };

  const handleImagePress = (urls: string[], index: number = 0) => {
    setPreviewImages(urls);
    setCurrentImageIndex(index);
    setImagePreviewVisible(true);
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('权限请求', '需要访问相册权限才能选择图片');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        try {
          // Show loading state
          setIsUploading(true);
          
          // Upload image to server
          const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `image_${Date.now()}.${ext}`;
          const uploadResponse = await chatApi.uploadImage(asset.uri, fileName);

          if (uploadResponse && uploadResponse.code === 0) {
            const imageUrl = uploadResponse.data;
            
            // Create image message with uploaded URL
            const imageContent = `[img]${imageUrl}[/img]`;
            
            // Create optimistic message
            const optimisticMsg: ChatMessage = {
              oId: `optimistic-${Date.now()}`,
              content: imageContent,
              md: imageContent,
              userName: currentUser?.userName || '',
              userNickname: currentUser?.userNickname || currentUser?.userName || '',
              userAvatarURL: currentUser?.userAvatar || '',
              userAvatarURL48: currentUser?.userAvatar || '',
              time: Date.now(),
              type: 'image',
              isHistory: false,
              isSelf: true,
            };

            setMessages((prev) => [...prev, optimisticMsg]);

            // Scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);

            // Send message through WebSocket
            try {
              const now = Date.now();
              const message = {
                id: `${now}`,
                content: imageContent,
                sender: {
                  id: String(currentUser?.id ?? ''),
                  name: currentUser?.userName || '',
                  avatar: currentUser?.userAvatar || '',
                  level: currentUser?.level || 1,
                  points: currentUser?.points || 0,
                  isAdmin: currentUser?.userRole === 'admin',
                },
                timestamp: new Date(now).toISOString(),
              };
              const messageData = JSON.stringify({
                type: 2,
                userId: -1,
                data: {
                  type: 'chat',
                  content: {
                    message,
                  },
                },
              });
              wsManager.send(messageData, CONNECTION_ID);
            } catch (error) {
              console.error('发送图片消息失败:', error);
              // Remove optimistic message on error
              setMessages((prev) => prev.filter((m) => m.oId !== optimisticMsg.oId));
              Alert.alert('发送失败', '图片消息发送失败，请重试');
            }
          } else {
            throw new Error(uploadResponse?.message || uploadResponse?.msg || '上传失败');
          }
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          Alert.alert('上传失败', '图片上传失败，请重试');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片时发生错误');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // 使用 userName 来判断是否是当前用户（参考 utools）
    const isSelf = item.userName === currentUser?.userName;
    const isRedPacketMessage = isRedPacket(item.content);
    const isImageMsg = isImageMessage(item.content);
    const imageUrls = parseImageUrls(item.content);

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
          ) : isImageMsg && imageUrls.length > 0 ? (
            <ImageMessage
              urls={imageUrls}
              onImagePress={(url) => handleImagePress(imageUrls, imageUrls.indexOf(url))}
              isSelf={isSelf}
            />
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

      {/* 在线用户 Modal */}
      <Modal
        visible={showOnlineUsers}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOnlineUsers(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOnlineUsers(false)}
        >
          <View style={[styles.onlineUsersModal, { backgroundColor: theme.card }]}>
            <View style={styles.onlineUsersModalHeader}>
              <Text style={[styles.onlineUsersTitle, { color: theme.text }]}>
                在线用户 ({onlineUsers.length})
              </Text>
              <TouchableOpacity onPress={() => setShowOnlineUsers(false)}>
                <IconSymbol name="xmark" size={18} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={onlineUsers}
              keyExtractor={(u) => u.userName}
              style={styles.onlineUsersList}
              renderItem={({ item: user }) => (
                <TouchableOpacity
                  style={styles.onlineUserItem}
                  onPress={() => {
                    setInputText((prev) => `${prev}@${user.userName} `);
                    setShowOnlineUsers(false);
                    inputRef.current?.focus();
                  }}
                >
                  <Image
                    source={{ uri: user.userAvatarURL || 'https://api.yucoder.cn/images/default-avatar.png' }}
                    style={styles.onlineUserAvatar}
                  />
                  <Text style={[styles.onlineUserName, { color: theme.text }]} numberOfLines={1}>
                    {user.userNickname || user.userName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 消息列表 + 输入框，整体被 KeyboardAvoidingView 包裹，键盘弹出时整体上移 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
      >
        {/* 加载更多指示器 */}
        {isLoadingMore && (
          <ActivityIndicator style={styles.loadingMore} color={theme.tint} />
        )}

        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.oId || item.id || `${item.userName}-${item.time}`}
          contentContainerStyle={styles.messagesList}
          style={{ opacity: listOpacity, flex: 1 }}
          onScroll={checkIfAtBottom}
          scrollEventThrottle={16}
          onContentSizeChange={(_, newHeight) => {
            if (!hasInitialScrolledRef.current && newHeight > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
              setTimeout(() => {
                hasInitialScrolledRef.current = true;
              }, 300);
            }
          }}
          maintainVisibleContentPosition={null}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
            setListOpacity(1);
          }}
        />

        {/* 新消息提示按钮 */}
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
        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.inputButton, { backgroundColor: theme.background, opacity: isUploading ? 0.5 : 1 }]}
            onPress={pickImage}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.icon} />
            ) : (
              <IconSymbol name="photo" size={20} color={theme.icon} />
            )}
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            placeholder="输入消息..."
            placeholderTextColor={theme.icon}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            returnKeyType="send"
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

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={imagePreviewVisible}
        images={previewImages}
        currentIndex={currentImageIndex}
        onClose={() => setImagePreviewVisible(false)}
        onIndexChanged={setCurrentImageIndex}
      />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 12,
  },
  onlineUsersModal: {
    width: 220,
    maxHeight: 400,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  onlineUsersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  onlineUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  onlineUsersList: {
    maxHeight: 320,
  },
  onlineUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  onlineUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  onlineUserName: {
    fontSize: 13,
    flex: 1,
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
  inputButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
    alignSelf: 'center',
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
