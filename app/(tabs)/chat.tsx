import { chatApi, ChatMessage, OnlineUser } from '@/api/chat';
import EmojiPicker from '@/components/EmojiPicker';
import ImageMessage from '@/components/ImageMessage';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';
import { userRemarkApi } from '@/api/userRemark';
import RedPacketDetailModal from '@/components/RedPacketDetailModal';
import RedPacketDialog from '@/components/RedPacketDialog';
import RedPacketMessageCard from '@/components/RedPacketMessageCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildMessageContextMenuItems,
  buildUserContextMenuItems,
  extractImageUrl,
  stripHtml,
} from '@/utils/chatContextMenu';
import {
  BlacklistUser,
  loadBlacklist,
  loadCachedRemarks,
  saveBlacklist,
  saveCachedRemarks,
  UserRemarksMap,
} from '@/utils/chatPreferences';
import { isRedPacketContent, parseRedPacketContent } from '@/utils/redPacket';
import { toast } from '@/utils/toast';
import wsManager, { BACKEND_HOST_WS } from '@/utils/websocket';
import * as Clipboard from 'expo-clipboard';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardEvent,
    Modal,
    Platform,
    StyleSheet,
    Text,
    Pressable,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
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
    oId: message.id || record.id || `${record.roomId || 'room'}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    id: record.id,
    roomId: record.roomId ?? message.roomId ?? null,
    content: message.content ?? '',
    md: message.content ?? '',
    client: message.client || message.source || '',
    timestamp: message.timestamp || message.sentAt || message.sentTime || '',
    time: timestamp,
    isHistory: true,
    quotedMessage: message.quotedMessage,
  };

  if (senderInfo) {
    legacyMessage.userId = senderInfo.userId || message.sender?.id || record.userId;
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

const getQuotedImageUrls = (content?: string): string[] => {
  const blockUrls = parseImageUrls(content);
  if (blockUrls.length > 0) return blockUrls;
  const htmlUrl = extractImageUrl(content || '');
  return htmlUrl ? [htmlUrl] : [];
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
  const isDark = colorScheme === 'dark';
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

  // 引用消息状态
  const [quotedMessage, setQuotedMessage] = useState<ChatMessage | null>(null);

  // 红包相关状态
  const [showRedPacketDialog, setShowRedPacketDialog] = useState(false);
  const [showRedPacketDetail, setShowRedPacketDetail] = useState(false);
  const [selectedRedPacketId, setSelectedRedPacketId] = useState<string | null>(null);
  const [selectedRedPacketSender, setSelectedRedPacketSender] = useState<{ name: string; avatar: string; msg: string } | null>(null);

  const [msgMenu, setMsgMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null as ChatMessage | null,
    items: [] as ContextMenuItem[],
  });
  const [userMenu, setUserMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    userName: '',
    avatar: '',
    userId: '',
  });
  const [userRemarks, setUserRemarks] = useState<UserRemarksMap>({});
  const [blacklist, setBlacklist] = useState<BlacklistUser[]>([]);
  const [remarkModal, setRemarkModal] = useState({
    visible: false,
    userId: '',
    userName: '',
    value: '',
  });

  // 表情包选择器状态
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 功能菜单状态
  const [showMenu, setShowMenu] = useState(false);

  const footerBottom = useSharedValue(0);
  const inputFooterHeightSV = useSharedValue(56);

  const keepInputFocused = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const scrollToBottomIfNeeded = useCallback(() => {
    if (isAtBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  const dismissInputPopups = useCallback(() => {
    setShowEmojiPicker(false);
    setShowMenu(false);
  }, []);

  useEffect(() => {
    const windowHeight = Dimensions.get('window').height;
    const frameEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const getKeyboardInset = (screenY: number) =>
      Math.max(0, windowHeight - screenY - tabBarHeight);

    const applyKeyboardFrame = (screenY: number) => {
      footerBottom.value = getKeyboardInset(screenY);
    };

    const frameSub = Keyboard.addListener(frameEvent, (event: KeyboardEvent) => {
      applyKeyboardFrame(event.endCoordinates.screenY);
    });

    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      applyKeyboardFrame(event.endCoordinates.screenY);
      dismissInputPopups();
      scrollToBottomIfNeeded();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === 'android') {
        applyKeyboardFrame(windowHeight);
      }
    });

    return () => {
      frameSub.remove();
      showSub.remove();
      hideSub.remove();
    };
  }, [dismissInputPopups, footerBottom, scrollToBottomIfNeeded, tabBarHeight]);

  const inputFooterAnimatedStyle = useAnimatedStyle(() => ({
    bottom: footerBottom.value,
  }));

  const listAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: footerBottom.value + inputFooterHeightSV.value,
  }));

  const newMessageAnimatedStyle = useAnimatedStyle(() => ({
    bottom: footerBottom.value + inputFooterHeightSV.value + 12,
  }));

  const popupAnchorStyle = useAnimatedStyle(() => ({
    bottom: footerBottom.value + inputFooterHeightSV.value + 8,
  }));

  const isAdmin = currentUser?.userRole === 'admin';

  const getUserDisplayName = useCallback(
    (userId?: string | number, userName?: string, userNickname?: string) => {
      const remark = userId != null ? userRemarks[String(userId)] : undefined;
      if (remark?.trim()) return remark.trim();
      if (userNickname?.trim()) return userNickname.trim();
      return userName || '未知用户';
    },
    [userRemarks],
  );

  const isBlacklisted = useCallback(
    (userName?: string) => Boolean(userName && blacklist.some((u) => u.userName === userName)),
    [blacklist],
  );

  useEffect(() => {
    const loadPreferences = async () => {
      const cached = await loadCachedRemarks();
      setUserRemarks(cached);
      try {
        const response = await userRemarkApi.getRemark();
        if (response.code === 0 && response.data?.content) {
          const parsed = JSON.parse(response.data.content);
          if (parsed && typeof parsed === 'object') {
            setUserRemarks(parsed);
            await saveCachedRemarks(parsed);
          }
        }
      } catch (error) {
        console.error('加载用户备注失败:', error);
      }

      if (currentUser?.userName) {
        setBlacklist(await loadBlacklist(currentUser.userName));
      }
    };
    loadPreferences();
  }, [currentUser?.userName]);

  // 每次进入 tab 时重新连接 WebSocket 并加载最新消息
  useFocusEffect(
    useCallback(() => {
      connectWebSocket();
      loadMessages();
      return () => {
        wsManager.close(CONNECTION_ID);
      };
    }, [])
  );

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

        if (isBlacklisted(newMessage.userName)) {
          return;
        }

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
  }, [currentUser?.userName, isBlacklisted]);

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
          // 去重：同一批次内可能有重复 id
          const seen = new Set();
          const uniqueMessages = reversedMessages.filter((m: ChatMessage) => {
            const key = m.oId || m.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return !isBlacklisted(m.userName);
          });
          setMessages(uniqueMessages);
          hasInitialScrolledRef.current = false;
          // 首次加载后滚动到底部
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        } else {
          // 加载更多历史消息，插入到前面（去重）
          const newMsgs = transformedMessages.reverse();
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m: ChatMessage) => m.oId || m.id));
            const uniqueNewMsgs = newMsgs.filter(
              (m: ChatMessage) => !existingIds.has(m.oId || m.id) && !isBlacklisted(m.userName),
            );
            return [...uniqueNewMsgs, ...prev];
          });
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
      quotedMessage: quotedMessage || undefined,
    };

    setInputText('');
    setMessages((prev) => [...prev, optimisticMsg]);

    // 清除引用消息
    setQuotedMessage(null);

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

      // 构建发送数据，包含引用消息
      const sendData: any = {
        type: 2,
        userId: -1,
        data: {
          type: 'chat',
          content: {
            message,
          },
        },
      };

      // 如果有引用消息，添加到发送数据中
      if (quotedMessage) {
        sendData.data.content.message.quotedMessage = {
          id: quotedMessage.oId || quotedMessage.id,
          content: quotedMessage.content || quotedMessage.md || '',
          sender: {
            name: quotedMessage.userName || '',
            avatar: quotedMessage.userAvatarURL48 || quotedMessage.userAvatarURL || '',
          },
        };
      }

      const messageData = JSON.stringify(sendData);
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

  // 压缩图片
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }], // 限制最大宽度为1280，等比例缩放
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 压缩质量70%
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error('图片压缩失败:', error);
      // 压缩失败返回原图
      return uri;
    }
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
        quality: 1, // 原图质量，后续用 ImageManipulator 压缩
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        try {
          // Show loading state
          setIsUploading(true);

          // 压缩图片
          const compressedUri = await compressImage(asset.uri);

          // Upload image to server
          const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `image_${Date.now()}.${ext}`;
          const uploadResponse = await chatApi.uploadImage(compressedUri, fileName);

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

  const closeMenus = () => {
    setMsgMenu({ visible: false, x: 0, y: 0, message: null, items: [] });
    setUserMenu({ visible: false, x: 0, y: 0, userName: '', avatar: '', userId: '' });
  };

  const openMessageMenu = (item: ChatMessage, x: number, y: number) => {
    const items = buildMessageContextMenuItems(item, currentUser?.userName, isAdmin);
    if (items.length === 0) return;
    setUserMenu({ visible: false, x: 0, y: 0, userName: '', avatar: '', userId: '' });
    setMsgMenu({ visible: true, x, y, message: item, items });
  };

  const openUserMenu = (
    userName: string,
    avatar: string,
    userId: string | number | undefined,
    x: number,
    y: number,
  ) => {
    if (!userName || userName === currentUser?.userName) return;
    setMsgMenu({ visible: false, x: 0, y: 0, message: null, items: [] });
    setUserMenu({
      visible: true,
      x,
      y,
      userName,
      avatar,
      userId: userId != null ? String(userId) : '',
    });
  };

  const handleMessageLongPress = (item: ChatMessage, x: number, y: number) => {
    openMessageMenu(item, x, y);
  };

  const handleAvatarLongPress = (item: ChatMessage, x: number, y: number) => {
    openUserMenu(
      item.userName || '',
      item.userAvatarURL48 || item.userAvatarURL || '',
      item.userId,
      x,
      y,
    );
  };

  const handleQuote = (message: ChatMessage) => {
    setQuotedMessage(message);
    keepInputFocused();
  };

  const sendRepeatMessage = (content: string) => {
    const text = stripHtml(content) || content;
    if (!text) return;

    const now = Date.now();
    const optimisticMsg: ChatMessage = {
      oId: `repeat-${now}`,
      content: text,
      md: text,
      userName: currentUser?.userName || '',
      userNickname: currentUser?.userNickname || currentUser?.userName || '',
      userAvatarURL: currentUser?.userAvatar || '',
      userAvatarURL48: currentUser?.userAvatar || '',
      time: now,
      type: 'chat',
      isHistory: false,
      isSelf: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    const message = {
      id: `${now}`,
      content: text,
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

    wsManager.send(
      JSON.stringify({
        type: 2,
        userId: -1,
        data: { type: 'chat', content: { message } },
      }),
      CONNECTION_ID,
    );
    toast.success('复读成功');
  };

  const handleRevokeMessage = async (message: ChatMessage) => {
    const oId = message.oId || message.id;
    if (!oId) {
      toast.error('无法撤回该消息');
      return;
    }

    Alert.alert('撤回消息', '确定要撤回这条消息吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await chatApi.revokeMessage(String(oId));
            if (response.code === 0) {
              setMessages((prev) => prev.filter((m) => (m.oId || m.id) !== oId));
              toast.success('消息已撤回');
            } else {
              toast.error(response.msg || '撤回失败');
            }
          } catch (error) {
            console.error('撤回消息失败:', error);
            toast.error('撤回失败，请稍后再试');
          }
        },
      },
    ]);
  };

  const openRemarkEditor = (userId: string, userName: string) => {
    const key = userId || userName;
    setRemarkModal({
      visible: true,
      userId: key,
      userName,
      value: userRemarks[key] || '',
    });
  };

  const saveRemark = async () => {
    const { userId, userName, value } = remarkModal;
    const trimmed = value.trim();
    const next = { ...userRemarks };
    if (trimmed) {
      next[userId] = trimmed;
    } else {
      delete next[userId];
    }

    try {
      await userRemarkApi.saveRemark(JSON.stringify(next));
      setUserRemarks(next);
      await saveCachedRemarks(next);
      setRemarkModal({ visible: false, userId: '', userName: '', value: '' });
      toast.success(trimmed ? '备注已保存' : '备注已删除');
    } catch (error) {
      console.error('保存备注失败:', error);
      toast.error('保存备注失败');
    }
  };

  const addToBlacklist = async (userName: string, avatarUrl?: string) => {
    if (!currentUser?.userName) return;
    if (blacklist.some((u) => u.userName === userName)) {
      toast.warning('该用户已在黑名单');
      return;
    }

    const next = [...blacklist, { userName, avatarUrl }];
    setBlacklist(next);
    await saveBlacklist(currentUser.userName, next);
    setMessages((prev) => prev.filter((m) => m.userName !== userName));
    toast.success('已加入黑名单');
  };

  const handleMessageMenuAction = async (action: string) => {
    const item = msgMenu.message;
    closeMenus();
    if (!item) return;

    const content = item.content || item.md || '';

    switch (action) {
      case 'quote':
        handleQuote(item);
        break;
      case 'at':
        if (item.userName) handleAtUser(item.userName);
        break;
      case 'copy':
        await Clipboard.setStringAsync(stripHtml(content) || content);
        toast.success('复制成功');
        break;
      case 'copy-image': {
        const url = extractImageUrl(content);
        if (url) {
          await Clipboard.setStringAsync(url);
          toast.success('复制成功');
        }
        break;
      }
      case 'repeat':
        sendRepeatMessage(content);
        break;
      case 'revoke':
        handleRevokeMessage(item);
        break;
      case 'remark':
        openRemarkEditor(String(item.userId || item.userName || ''), item.userName || '');
        break;
      case 'blacklist':
        addToBlacklist(item.userName || '', item.userAvatarURL48 || item.userAvatarURL);
        break;
      case 'add-emoji':
        toast.info('添加到表情功能即将上线');
        break;
      default:
        break;
    }
  };

  const handleUserMenuAction = async (action: string) => {
    const { userName, avatar, userId } = userMenu;
    closeMenus();

    switch (action) {
      case 'at':
        handleAtUser(userName);
        break;
      case 'remark':
        openRemarkEditor(userId || userName, userName);
        break;
      case 'blacklist':
        await addToBlacklist(userName, avatar);
        break;
      default:
        break;
    }
  };

  // 处理表情选择
  const handleEmojiSelect = (content: string) => {
    // 如果是emoji字符，添加到输入框
    if (!content.startsWith('[img]')) {
      setInputText(prev => prev + content);
      inputRef.current?.focus();
    } else {
      // 如果是图片表情，直接发送
      sendImageMessage(content);
    }
  };

  // 发送图片消息
  const sendImageMessage = (imageContent: string) => {
    const now = Date.now();

    // 乐观更新：立即在本地添加图片消息
    const optimisticMsg: ChatMessage = {
      oId: `image-${now}`,
      content: imageContent,
      md: imageContent,
      userName: currentUser?.userName || '',
      userNickname: currentUser?.userNickname || currentUser?.userName || '',
      userAvatarURL: currentUser?.userAvatar || '',
      userAvatarURL48: currentUser?.userAvatar || '',
      time: now,
      type: 'image',
      isHistory: false,
      isSelf: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // 滚动到底部
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // 发送图片消息到聊天室
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

    try {
      wsManager.send(messageData, CONNECTION_ID);
    } catch (error) {
      console.error('发送图片消息失败:', error);
      setMessages((prev) => prev.filter((m) => m.oId !== optimisticMsg.oId));
      Alert.alert('发送失败', '图片消息发送失败，请重试');
    }
  };

  // 处理 @ 用户
  const handleAtUser = (userName: string) => {
    setInputText((prev) => `${prev}@${userName} `);
    inputRef.current?.focus();
  };

  const handleViewRedPacketDetails = (item: ChatMessage) => {
    const redPacketInfo = parseRedPacketContent(item.content || item.md);
    if (redPacketInfo?.redPacketId) {
      setSelectedRedPacketId(redPacketInfo.redPacketId);
      setSelectedRedPacketSender({
        name: item.userNickname || item.userName || '未知用户',
        avatar: item.userAvatarURL48 || item.userAvatarURL || '',
        msg: redPacketInfo.msg || '红包',
      });
      setShowRedPacketDetail(true);
    }
  };

  // 处理发红包
  const handleSendRedPacket = (result: any) => {
    // API返回的是红包ID字符串
    const redPacketId = typeof result === 'string' ? result : result?.data;
    if (redPacketId) {
      const redPacketContent = `[redpacket]${redPacketId}[/redpacket]`;
      const now = Date.now();

      // 乐观更新：立即在本地添加红包消息
      const optimisticMsg: ChatMessage = {
        oId: `redpacket-${now}`,
        content: redPacketContent,
        md: redPacketContent,
        userName: currentUser?.userName || '',
        userNickname: currentUser?.userNickname || currentUser?.userName || '',
        userAvatarURL: currentUser?.userAvatar || '',
        userAvatarURL48: currentUser?.userAvatar || '',
        time: now,
        type: 'chat',
        isHistory: false,
        isSelf: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // 滚动到底部
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      // 发送红包消息到聊天室
      const message = {
        id: `${now}`,
        content: redPacketContent,
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
    }
  };

  // 清除引用
  const clearQuote = () => {
    setQuotedMessage(null);
  };

  const renderQuotedContentBody = (quotedContent: string, compact = false) => {
    if (isRedPacketContent(quotedContent)) {
      const quotedPacket = parseRedPacketContent(quotedContent);
      return (
        <View style={styles.quotedRedPacket}>
          <Text style={styles.quotedRedPacketIcon}>🧧</Text>
          <View style={styles.quotedRedPacketInfo}>
            <Text style={styles.quotedRedPacketType}>红包</Text>
            <Text style={styles.quotedRedPacketMsg} numberOfLines={1}>
              {quotedPacket?.msg || '红包'}
            </Text>
          </View>
        </View>
      );
    }

    const quotedImageUrls = getQuotedImageUrls(quotedContent);
    if (quotedImageUrls.length > 0) {
      const thumbSize = compact ? 44 : 72;
      return (
        <View style={styles.quotedImageRow}>
          <Image
            source={{ uri: quotedImageUrls[0] }}
            style={[styles.quotedImageThumb, { width: thumbSize, height: thumbSize }]}
            resizeMode="cover"
          />
          {quotedImageUrls.length > 1 && (
            <Text style={[styles.quotedImageMore, { color: theme.icon }]}>
              +{quotedImageUrls.length - 1}
            </Text>
          )}
        </View>
      );
    }

    return (
      <Text style={[styles.quotedText, { color: theme.icon }]} numberOfLines={compact ? 1 : 2}>
        {processMessageContent(quotedContent)}
      </Text>
    );
  };

  // 渲染引用消息
  const renderQuotedMessage = (quoted: any, isSelf: boolean) => {
    if (!quoted) return null;

    const quotedContent = quoted.content || quoted.md || '';
    const quotedSender =
      quoted.sender?.name || quoted.userNickname || quoted.userName || '未知用户';

    return (
      <View style={[styles.quotedMessage, { backgroundColor: isSelf ? 'rgba(255,255,255,0.2)' : theme.background }]}>
        <Text style={[styles.quotedSender, { color: theme.tint }]} numberOfLines={1}>
          {quotedSender}
        </Text>
        {renderQuotedContentBody(quotedContent)}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // 使用 userName 来判断是否是当前用户（参考 utools）
    const isSelf = item.userName === currentUser?.userName;
    const isRedPacketMessage = isRedPacketContent(item.content || item.md);
    const isImageMsg = isImageMessage(item.content);
    const imageUrls = parseImageUrls(item.content);
    const hasQuotedMessage = item.quotedMessage || (item.rawMessage?.quotedMessage);
    const quoted = item.quotedMessage || item.rawMessage?.quotedMessage;

    return (
      <View style={[styles.messageRow, isSelf && styles.messageRowSelf]}>
        <Pressable
          onPress={() => item.userName && handleAtUser(item.userName)}
          onLongPress={(event) =>
            handleAvatarLongPress(item, event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          delayLongPress={400}
        >
          <Image
            source={{ uri: item.userAvatarURL48 || item.userAvatarURL || 'https://api.yucoder.cn/images/default-avatar.png' }}
            style={styles.avatar}
          />
        </Pressable>
        <Pressable
          style={[
            styles.messageBubble,
            isSelf ? [styles.messageBubbleSelf, { backgroundColor: isDark ? '#3a3a3d' : '#f0f0f0' }] : { backgroundColor: isDark ? '#3a3a3d' : '#f0f0f0' },
          ]}
          onLongPress={(event) =>
            handleMessageLongPress(item, event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          delayLongPress={400}
        >
          {/* 非自己的消息显示昵称 */}
          {!isSelf && (
            <Text style={[styles.senderName, { color: isDark ? '#b0b0b0' : '#666' }]}>
              {getUserDisplayName(item.userId, item.userName, item.userNickname)}
            </Text>
          )}

          {/* 引用消息 */}
          {hasQuotedMessage && renderQuotedMessage(quoted, isSelf)}

          {isRedPacketMessage ? (
            <RedPacketMessageCard
              message={item}
              onViewDetails={handleViewRedPacketDetails}
            />
          ) : isImageMsg && imageUrls.length > 0 ? (
            <ImageMessage
              urls={imageUrls}
              onImagePress={(url) => handleImagePress(imageUrls, imageUrls.indexOf(url))}
              onLongPress={(event) =>
                handleMessageLongPress(item, event.nativeEvent.pageX, event.nativeEvent.pageY)
              }
              isSelf={isSelf}
            />
          ) : (
            <Text style={[styles.messageText, { color: theme.text }]}>
              {processMessageContent(item.content)}
            </Text>
          )}
          <Text style={[styles.messageTime, { color: theme.icon }]}>
            {item.time ? new Date(item.time).toLocaleTimeString() : ' '}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            摸鱼岛
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
        <View style={[styles.topicBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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
              keyExtractor={(u, index) => `${u.userName}-${index}`}
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

      <View style={styles.chatBody}>
        {/* 消息列表：底部留白随键盘同步上移，保持在输入框上方 */}
        <Animated.View style={[styles.listContainer, listAnimatedStyle]}>
          {(showEmojiPicker || showMenu) && (
            <Pressable
              style={styles.popupBackdrop}
              onPress={() => {
                setShowEmojiPicker(false);
                setShowMenu(false);
              }}
            />
          )}
          {isLoadingMore && (
            <ActivityIndicator style={styles.loadingMore} color={theme.tint} />
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.oId || item.id || `${item.userName}-${item.time}`}
            contentContainerStyle={styles.messagesList}
            style={{ opacity: listOpacity, flex: 1 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
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
            maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: undefined }}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: false,
              });
              setListOpacity(1);
            }}
          />
        </Animated.View>

        {/* 新消息提示按钮 */}
        {newMessageCount > 0 && !isAtBottom && (
          <Animated.View style={[styles.newMessageNotification, newMessageAnimatedStyle]}>
            <TouchableOpacity
              onPress={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
            >
              <IconSymbol name="chevron.down" size={16} color="#fff" />
              <Text style={styles.newMessageNotificationText}>
                {newMessageCount} 条新消息
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 底部输入区：随键盘高度过渡，收起时回落到底部 */}
        <Animated.View
          onLayout={(e) => {
            inputFooterHeightSV.value = e.nativeEvent.layout.height;
          }}
          style={[styles.inputFooter, inputFooterAnimatedStyle]}
        >
          {quotedMessage && (
            <View style={[styles.quotePreviewContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <View style={styles.quotePreviewContent}>
                <Text style={[styles.quotePreviewLabel, { color: theme.tint }]} numberOfLines={1}>
                  引用 {quotedMessage.userNickname || quotedMessage.userName}
                </Text>
                {renderQuotedContentBody(quotedMessage.content || quotedMessage.md || '', true)}
              </View>
              <TouchableOpacity onPress={clearQuote}>
                <IconSymbol name="xmark" size={18} color={theme.icon} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          {/* 表情包按钮 */}
          <TouchableOpacity
            style={[styles.inputButton, { backgroundColor: theme.background }]}
            onPress={() => {
              setShowMenu(false);
              setShowEmojiPicker((prev) => !prev);
              keepInputFocused();
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="face.smiling" size={22} color={theme.tint} />
          </TouchableOpacity>

          {/* 功能菜单按钮 */}
          <TouchableOpacity
            style={[styles.inputButton, { backgroundColor: theme.background, opacity: isUploading ? 0.5 : 1 }]}
            onPress={() => {
              setShowEmojiPicker(false);
              setShowMenu((prev) => !prev);
              keepInputFocused();
            }}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.icon} />
            ) : (
              <IconSymbol name="ellipsis" size={22} color={theme.icon} />
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
        </Animated.View>

        {showEmojiPicker && (
          <Animated.View
            style={[styles.emojiBubble, { backgroundColor: theme.card }, popupAnchorStyle]}
          >
            <EmojiPicker
              compact
              onSelect={(content) => {
                setShowEmojiPicker(false);
                handleEmojiSelect(content);
                keepInputFocused();
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </Animated.View>
        )}

        {showMenu && (
          <Animated.View
            style={[styles.menuBubble, { backgroundColor: theme.card }, popupAnchorStyle]}
          >
            <TouchableOpacity
              style={styles.menuBubbleItem}
              onPress={() => {
                setShowMenu(false);
                pickImage();
              }}
            >
              <View style={[styles.menuBubbleIcon, { backgroundColor: theme.background }]}>
                <IconSymbol name="photo" size={18} color={theme.tint} />
              </View>
              <Text style={[styles.menuBubbleText, { color: theme.text }]}>图片</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuBubbleItem}
              onPress={() => {
                setShowMenu(false);
                setShowEmojiPicker(true);
                keepInputFocused();
              }}
            >
              <View style={[styles.menuBubbleIcon, { backgroundColor: theme.background }]}>
                <IconSymbol name="face.smiling" size={18} color={theme.tint} />
              </View>
              <Text style={[styles.menuBubbleText, { color: theme.text }]}>表情</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuBubbleItem}
              onPress={() => {
                setShowMenu(false);
                setShowRedPacketDialog(true);
              }}
            >
              <View style={[styles.menuBubbleIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                <IconSymbol name="gift.fill" size={18} color="#FF6B6B" />
              </View>
              <Text style={[styles.menuBubbleText, { color: theme.text }]}>红包</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={imagePreviewVisible}
        images={previewImages}
        currentIndex={currentImageIndex}
        onClose={() => setImagePreviewVisible(false)}
        onIndexChanged={setCurrentImageIndex}
      />

      <ContextMenu
        visible={msgMenu.visible}
        x={msgMenu.x}
        y={msgMenu.y}
        items={msgMenu.items}
        onAction={handleMessageMenuAction}
        onClose={closeMenus}
      />

      <ContextMenu
        visible={userMenu.visible}
        x={userMenu.x}
        y={userMenu.y}
        items={buildUserContextMenuItems()}
        onAction={handleUserMenuAction}
        onClose={closeMenus}
      />

      <Modal
        visible={remarkModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemarkModal({ visible: false, userId: '', userName: '', value: '' })}
      >
        <Pressable
          style={styles.remarkOverlay}
          onPress={() => setRemarkModal({ visible: false, userId: '', userName: '', value: '' })}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.remarkDialog, { backgroundColor: theme.card }]}>
            <Text style={[styles.remarkTitle, { color: theme.text }]}>
              修改备注 · {remarkModal.userName}
            </Text>
            <TextInput
              style={[styles.remarkInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              placeholder="留空则删除备注"
              placeholderTextColor={theme.icon}
              value={remarkModal.value}
              onChangeText={(value) => setRemarkModal((prev) => ({ ...prev, value }))}
              maxLength={20}
            />
            <View style={styles.remarkActions}>
              <TouchableOpacity
                style={[styles.remarkButton, { backgroundColor: theme.background }]}
                onPress={() => setRemarkModal({ visible: false, userId: '', userName: '', value: '' })}
              >
                <Text style={{ color: theme.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.remarkButton, { backgroundColor: theme.tint }]}
                onPress={saveRemark}
              >
                <Text style={{ color: '#fff' }}>保存</Text>
              </TouchableOpacity>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* 发红包对话框 */}
      <RedPacketDialog
        visible={showRedPacketDialog}
        onClose={() => setShowRedPacketDialog(false)}
        onSend={handleSendRedPacket}
      />

      {/* 红包详情弹窗 */}
      <RedPacketDetailModal
        visible={showRedPacketDetail}
        onClose={() => setShowRedPacketDetail(false)}
        redPacketId={selectedRedPacketId}
        senderName={selectedRedPacketSender?.name}
        senderAvatar={selectedRedPacketSender?.avatar}
        msg={selectedRedPacketSender?.msg}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  remarkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  remarkDialog: {
    borderRadius: 12,
    padding: 16,
  },
  remarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  remarkInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  remarkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  remarkButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatBody: {
    flex: 1,
    position: 'relative',
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  inputFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
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
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  // 表情包气泡样式 - 输入框上方
  emojiBubble: {
    position: 'absolute',
    left: 12,
    width: 300,
    zIndex: 25,
    height: 280,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  // 菜单气泡样式 - 输入框上方
  menuBubble: {
    position: 'absolute',
    left: 56,
    zIndex: 25,
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    gap: 16,
  },
  menuBubbleItem: {
    alignItems: 'center',
    gap: 6,
  },
  menuBubbleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBubbleText: {
    fontSize: 12,
    fontWeight: '500',
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
    zIndex: 3,
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
  // 引用消息样式
  quotedMessage: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  quotedSender: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  quotedText: {
    fontSize: 12,
    lineHeight: 16,
  },
  quotedRedPacket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  quotedRedPacketIcon: {
    fontSize: 20,
  },
  quotedRedPacketInfo: {
    flex: 1,
    minWidth: 0,
  },
  quotedRedPacketType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  quotedRedPacketMsg: {
    fontSize: 11,
    color: '#fffbe6',
  },
  quotedImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  quotedImageThumb: {
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  quotedImageMore: {
    fontSize: 12,
  },
  // 引用输入框预览样式
  quotePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  quotePreviewContent: {
    flex: 1,
    gap: 4,
  },
  quotePreviewLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
