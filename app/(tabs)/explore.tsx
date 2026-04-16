import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { isLoggedIn, userInfo, logout, refreshUserInfo } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (isLoggedIn) {
      refreshUserInfo();
    }
  }, [isLoggedIn]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  // 未登录状态
  if (!isLoggedIn) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerBg, { backgroundColor: theme.tint }]} />
        <View style={[styles.unauthCard, { backgroundColor: theme.card }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
            <IconSymbol size={60} color="#808080" name="person.fill" />
          </View>
          <ThemedText type="title" style={{ fontFamily: Fonts.rounded, marginTop: 20 }}>
            个人信息
          </ThemedText>
          <ThemedText style={styles.hintText}>您尚未登录，请先登录</ThemedText>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.tint }]}
            onPress={handleLogin}>
            <ThemedText style={styles.loginButtonText}>去登录</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}>
      {/* 顶部渐变背景 */}
      <View style={[styles.headerBg, { backgroundColor: theme.tint }]} />

      {/* 头像卡片 */}
      <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
        <View style={[styles.avatarWrapper, { borderColor: theme.card }]}>
          {userInfo?.userAvatar ? (
            <Image
              source={{ uri: userInfo.userAvatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#444' : '#e0e0e0' }]}>
              <IconSymbol size={50} color="#808080" name="person.fill" />
            </View>
          )}
        </View>

        {/* 用户名 */}
        <ThemedText type="title" style={[styles.nickname, { fontFamily: Fonts.rounded }]}>
          {userInfo?.userNickname || userInfo?.userName || '用户'}
        </ThemedText>
        <ThemedText style={styles.username}>@{userInfo?.userName}</ThemedText>

        {/* VIP 标识 */}
        {userInfo?.vip && (
          <View style={[styles.vipBadge, { backgroundColor: isDark ? '#3d3d20' : '#FFF8E1' }]}>
            <IconSymbol size={12} color="#FFD700" name="gift.fill" />
            <ThemedText style={[styles.vipText, { color: isDark ? '#FFD700' : '#FF8F00' }]}>VIP</ThemedText>
          </View>
        )}
      </View>

      {/* 统计卡片 */}
      <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={styles.statItem}>
          <ThemedText style={styles.statValue}>{userInfo?.points || userInfo?.userPoint || 0}</ThemedText>
          <ThemedText style={styles.statLabel}>积分</ThemedText>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem}>
          <ThemedText style={styles.statValue}>{userInfo?.level || 1}</ThemedText>
          <ThemedText style={styles.statLabel}>等级</ThemedText>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem}>
          <ThemedText style={styles.statValue}>{userInfo?.followingUserCount || 0}</ThemedText>
          <ThemedText style={styles.statLabel}>关注</ThemedText>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem}>
          <ThemedText style={styles.statValue}>{userInfo?.followerCount || 0}</ThemedText>
          <ThemedText style={styles.statLabel}>粉丝</ThemedText>
        </TouchableOpacity>
      </View>

      {/* 个人简介 */}
      {userInfo?.userProfile && (
        <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <ThemedText style={styles.sectionTitle}>个人简介</ThemedText>
          <ThemedText style={styles.bioText}>{userInfo.userProfile}</ThemedText>
        </View>
      )}

      {/* 账号信息 */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        <ThemedText style={styles.sectionTitle}>账号信息</ThemedText>

        <View style={styles.infoItem}>
          <View style={styles.infoLeft}>
            <IconSymbol size={18} color={theme.tint} name="tag.fill" style={styles.infoIcon} />
            <ThemedText style={styles.infoLabel}>用户编号</ThemedText>
          </View>
          <ThemedText style={styles.infoValue}>{userInfo?.userNo || userInfo?.id || '-'}</ThemedText>
        </View>

        {userInfo?.email && (
          <View style={styles.infoItem}>
            <View style={styles.infoLeft}>
              <IconSymbol size={18} color={theme.tint} name="paperplane.fill" style={styles.infoIcon} />
              <ThemedText style={styles.infoLabel}>邮箱</ThemedText>
            </View>
            <ThemedText style={styles.infoValue}>{userInfo.email}</ThemedText>
          </View>
        )}

        {userInfo?.createTime && (
          <View style={styles.infoItem}>
            <View style={styles.infoLeft}>
              <IconSymbol size={18} color={theme.tint} name="gift.fill" style={styles.infoIcon} />
              <ThemedText style={styles.infoLabel}>注册时间</ThemedText>
            </View>
            <ThemedText style={styles.infoValue}>
              {new Date(userInfo.createTime).toLocaleDateString('zh-CN')}
            </ThemedText>
          </View>
        )}

        <View style={styles.infoItem}>
          <View style={styles.infoLeft}>
            <IconSymbol size={18} color={theme.tint} name="person.fill" style={styles.infoIcon} />
            <ThemedText style={styles.infoLabel}>在线状态</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: userInfo?.userOnlineFlag === false ? '#99999920' : '#4CAF5020' }]}>
            <View style={[styles.statusDot, { backgroundColor: userInfo?.userOnlineFlag === false ? '#999' : '#4CAF50' }]} />
            <ThemedText style={[styles.statusText, { color: userInfo?.userOnlineFlag === false ? '#999' : '#4CAF50' }]}>
              {userInfo?.userOnlineFlag === false ? '离线' : '在线'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* 退出登录按钮 */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? '#3d2020' : '#FF525210' }]} onPress={handleLogout}>
        <IconSymbol name="arrow.right" size={18} color="#FF5252" />
        <ThemedText style={[styles.logoutButtonText, { color: '#FF5252' }]}>退出登录</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerBg: {
    height: 140,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  unauthCard: {
    marginHorizontal: 16,
    marginTop: -50,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: -50,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 22,
    marginTop: 12,
  },
  username: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 4,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  vipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.7,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    opacity: 0.8,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  infoValue: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  hintText: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  loginButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
