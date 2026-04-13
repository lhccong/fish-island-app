import { userApi } from '@/api/user';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface EmoticonItem {
  id: number;
  emoticonSrc: string;
}

interface EmojiPickerProps {
  visible?: boolean;
  onClose?: () => void;
  onSelect: (content: string) => void;
  compact?: boolean;
}

// 常用Emoji列表
const DEFAULT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
  '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
  '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
  '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
  '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
  '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦',
  '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
  '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
  '👍', '👎', '👏', '🙌', '🤝', '🤞', '🤟', '🤘',
  '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
  '🖐️', '🖖', '👋', '🤜', '🤛', '✊', '👊', '🤲',
  '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀',
  '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛',
  '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️',
  '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
  '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎',
  '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋',
  '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓',
  '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶',
  '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐',
  '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️',
  '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔',
  '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳',
  '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔',
  '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱',
  '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎',
  '🌱', '💠', '🌀', '➿', '🌐', 'Ⓜ️', '🏧', '🈂️',
  '🛂', '🛃', '🛄', '🛅', '♿', '🚭', '🚾', '🚰',
  '🚹', '🚺', '🚻', '🚮', '🎦', '📶', '🈯', '💠',
  '🔰', '⁉️', '〽️', '⚠️', '🌀', '🌐', '🏧', '🈂️',
];

type TabType = 'default' | 'favorite' | 'search';

export default function EmojiPicker({ visible, onClose, onSelect, compact }: EmojiPickerProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabType>('default');

  // 收藏表情包状态
  const [favorites, setFavorites] = useState<EmoticonItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [hasMoreFavorites, setHasMoreFavorites] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 在线搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 加载收藏表情包
  const loadFavorites = useCallback(async (page = 1, isLoadMore = false) => {
    if (favoritesLoading || (isLoadMore && !hasMoreFavorites)) return;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setFavoritesLoading(true);
    }

    try {
      const res = await userApi.listEmoticonFavourByPage({
        current: page,
        pageSize: 20,
        sortField: 'createTime',
        sortOrder: 'desc',
      });

      if (res.code === 0 && res.data) {
        const records = res.data.records || [];
        if (isLoadMore) {
          setFavorites(prev => [...prev, ...records]);
        } else {
          setFavorites(records);
        }
        setFavoritesPage(page);
        setHasMoreFavorites(page < (res.data.pages || 1));
      }
    } catch (error) {
      console.error('加载收藏表情包失败:', error);
    } finally {
      setFavoritesLoading(false);
      setIsLoadingMore(false);
    }
  }, [favoritesLoading, hasMoreFavorites]);

  // 加载更多收藏
  const loadMoreFavorites = () => {
    if (!isLoadingMore && hasMoreFavorites) {
      loadFavorites(favoritesPage + 1, true);
    }
  };

  // 添加表情包
  const handleAddFavorite = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('权限请求', '需要访问相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `emoji_${Date.now()}.${ext}`;

        // 先上传图片
        const uploadRes = await userApi.uploadImage(asset.uri, fileName);
        if (uploadRes.code === 0 && uploadRes.data) {
          const imageUrl = uploadRes.data;
          // 添加到收藏
          const addRes = await userApi.addEmoticonFavour(imageUrl);
          if (addRes.code === 0) {
            Alert.alert('成功', '添加表情包成功');
            // 重新加载第一页
            loadFavorites(1, false);
          } else {
            Alert.alert('失败', addRes.message || '添加表情包失败');
          }
        } else {
          Alert.alert('失败', uploadRes.message || '上传失败');
        }
      }
    } catch (error) {
      console.error('添加表情包失败:', error);
      Alert.alert('失败', '添加表情包失败');
    }
  };

  // 删除表情包
  const handleDeleteFavorite = (id: number) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个表情包吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await userApi.deleteEmoticonFavour(id);
              if (res.code === 0) {
                setFavorites(prev => prev.filter(item => item.id !== id));
              } else {
                Alert.alert('失败', res.message || '删除失败');
              }
            } catch (error) {
              console.error('删除表情包失败:', error);
              Alert.alert('失败', '删除表情包失败');
            }
          },
        },
      ]
    );
  };

  // 搜索在线表情包（使用 CORS 代理）
  const searchOnlineEmojis = async (keyword: string) => {
    if (!keyword.trim()) {
      console.log('搜索关键词为空');
      return;
    }
    setSearchLoading(true);
    console.log('开始搜索表情包，关键词:', keyword);

    try {
      // 使用 CORS 代理服务访问百度图片搜索
      const searchQuery = encodeURIComponent(keyword.trim() + '表情包');
      const baiduUrl = `https://image.baidu.com/search/acjson?tn=resultjson_com&word=${searchQuery}&queryWord=${searchQuery}&ie=utf-8&oe=utf-8&pn=0&rn=30`;

      // 尝试多个 CORS 代理
      const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(baiduUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${baiduUrl}`,
      ];

      let response = null;
      let lastError = null;

      for (const proxyUrl of proxyUrls) {
        try {
          console.log('尝试代理:', proxyUrl);
          response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          if (response.ok) {
            console.log('代理请求成功');
            break;
          }
        } catch (e) {
          console.log('代理失败:', proxyUrl, e);
          lastError = e;
        }
      }

      if (!response || !response.ok) {
        throw new Error('所有代理都失败: ' + (lastError?.message || 'Unknown error'));
      }

      const data = await response.json();
      console.log('搜索返回数据:', JSON.stringify(data).slice(0, 200));

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const images = data.data
          .filter((item: any) => item && (item.thumbURL || item.middleURL || item.objURL))
          .map((item: any) => item.thumbURL || item.middleURL || item.objURL)
          .slice(0, 20);
        console.log('找到图片数量:', images.length);
        setSearchResults(images);
      } else {
        console.log('未找到图片');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索表情包失败:', error);
      Alert.alert('搜索失败', '表情包搜索服务暂时不可用，请稍后再试');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 选择表情
  const handleSelectEmoji = (emoji: string) => {
    onSelect(emoji);
    onClose?.();
  };

  // 选择收藏的表情包
  const handleSelectFavorite = (item: EmoticonItem) => {
    const content = `[img]${item.emoticonSrc}[/img]`;
    onSelect(content);
    onClose?.();
  };

  // 选择在线搜索的表情包
  const handleSelectOnline = (url: string) => {
    const content = `[img]${url}[/img]`;
    onSelect(content);
    onClose?.();
  };

  // 切换标签时加载数据
  useEffect(() => {
    if (visible !== false) {
      if (activeTab === 'favorite') {
        loadFavorites(1, false);
      } else if (activeTab === 'search' && searchResults.length === 0) {
        searchOnlineEmojis('热门');
      }
    }
  }, [visible, activeTab]);

  // 渲染默认表情
  const renderDefaultTab = () => (
    <FlatList
      data={DEFAULT_EMOJIS}
      numColumns={8}
      keyExtractor={(item, index) => `emoji-${index}`}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.emojiItem}
          onPress={() => handleSelectEmoji(item)}
        >
          <Text style={styles.emojiText}>{item}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.emojiGrid}
    />
  );

  // 渲染收藏表情包
  const renderFavoriteTab = () => (
    <View style={styles.favoriteContainer}>
      {/* 添加按钮 */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddFavorite}>
        <IconSymbol name="plus" size={24} color={theme.tint} />
        <Text style={[styles.addButtonText, { color: theme.tint }]}>添加表情包</Text>
      </TouchableOpacity>

      {favoritesLoading && favorites.length === 0 ? (
        <ActivityIndicator color={theme.tint} style={styles.loading} />
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="heart.slash" size={48} color={theme.icon} />
          <Text style={[styles.emptyText, { color: theme.icon }]}>暂无收藏的表情包</Text>
          <Text style={[styles.emptySubText, { color: theme.icon }]}>点击上方按钮添加</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          numColumns={4}
          keyExtractor={(item) => `fav-${item.id}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.favoriteItem}
              onPress={() => handleSelectFavorite(item)}
              onLongPress={() => handleDeleteFavorite(item.id)}
              delayLongPress={500}
            >
              <Image source={{ uri: item.emoticonSrc }} style={styles.favoriteImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          onEndReached={loadMoreFavorites}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={theme.tint} style={styles.loadingMore} /> : null}
          contentContainerStyle={styles.favoriteGrid}
        />
      )}
    </View>
  );

  // 渲染在线搜索
  const renderSearchTab = () => (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, { backgroundColor: theme.background }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="搜索表情包..."
          placeholderTextColor={theme.icon}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          onSubmitEditing={(e) => {
            console.log('回车搜索，关键词:', searchKeyword);
            searchOnlineEmojis(searchKeyword);
          }}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={() => {
            console.log('搜索按钮点击，关键词:', searchKeyword);
            searchOnlineEmojis(searchKeyword);
          }}
          activeOpacity={0.7}
        >
          <IconSymbol name="magnifyingglass" size={20} color={theme.tint} />
        </TouchableOpacity>
      </View>

      {searchLoading && searchResults.length === 0 ? (
        <ActivityIndicator color={theme.tint} style={styles.loading} />
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="photo" size={48} color={theme.icon} />
          <Text style={[styles.emptyText, { color: theme.icon }]}>搜索表情包</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          numColumns={4}
          keyExtractor={(item, index) => `search-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.searchItem}
              onPress={() => handleSelectOnline(item)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item }}
                style={styles.searchImage}
                resizeMode="cover"
                onError={(e) => console.log('图片加载失败:', item, e.nativeEvent.error)}
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.searchGrid}
          style={styles.searchList}
        />
      )}
    </View>
  );

  // compact 模式渲染（无 Modal，直接渲染内容）
  const renderCompact = () => (
    <View style={[styles.compactContainer, { backgroundColor: theme.card }]}>
      {/* 标签栏 */}
      <View style={[styles.compactTabBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.compactTab, activeTab === 'default' && { borderBottomColor: theme.tint }]}
          onPress={() => setActiveTab('default')}
        >
          <Text style={[styles.compactTabText, { color: activeTab === 'default' ? theme.tint : theme.icon }]}>
            默认
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactTab, activeTab === 'favorite' && { borderBottomColor: theme.tint }]}
          onPress={() => setActiveTab('favorite')}
        >
          <Text style={[styles.compactTabText, { color: activeTab === 'favorite' ? theme.tint : theme.icon }]}>
            收藏
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactTab, activeTab === 'search' && { borderBottomColor: theme.tint }]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.compactTabText, { color: activeTab === 'search' ? theme.tint : theme.icon }]}>
            搜索
          </Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <View style={styles.compactContent}>
        {activeTab === 'default' && renderDefaultTab()}
        {activeTab === 'favorite' && renderFavoriteTab()}
        {activeTab === 'search' && renderSearchTab()}
      </View>
    </View>
  );

  // 全屏 Modal 模式渲染
  const renderModal = () => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* 头部 */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>表情</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          {/* 标签栏 */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'default' && { borderBottomColor: theme.tint }]}
              onPress={() => setActiveTab('default')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'default' ? theme.tint : theme.icon }]}>
                默认
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'favorite' && { borderBottomColor: theme.tint }]}
              onPress={() => setActiveTab('favorite')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'favorite' ? theme.tint : theme.icon }]}>
                收藏
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'search' && { borderBottomColor: theme.tint }]}
              onPress={() => setActiveTab('search')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'search' ? theme.tint : theme.icon }]}>
                搜索
              </Text>
            </TouchableOpacity>
          </View>

          {/* 内容区域 */}
          <View style={styles.content}>
            {activeTab === 'default' && renderDefaultTab()}
            {activeTab === 'favorite' && renderFavoriteTab()}
            {activeTab === 'search' && renderSearchTab()}
          </View>
        </View>
      </View>
    </Modal>
  );

  if (compact) {
    return renderCompact();
  }

  return renderModal();
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    height: 320,
    padding: 8,
  },
  // compact 模式样式
  compactContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  compactTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  compactTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactContent: {
    flex: 1,
    padding: 6,
  },
  // 默认表情样式
  emojiGrid: {
    paddingBottom: 20,
  },
  emojiItem: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 28,
  },
  // 收藏表情样式
  favoriteContainer: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  favoriteGrid: {
    paddingBottom: 20,
  },
  favoriteItem: {
    width: '25%',
    aspectRatio: 1,
    padding: 4,
  },
  favoriteImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  // 搜索样式
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
  },
  searchList: {
    flex: 1,
  },
  searchGrid: {
    paddingBottom: 20,
  },
  searchItem: {
    width: '25%',
    aspectRatio: 1,
    padding: 4,
  },
  searchImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  // 通用样式
  loading: {
    marginTop: 40,
  },
  loadingMore: {
    marginVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    marginTop: 8,
    opacity: 0.7,
  },
});
