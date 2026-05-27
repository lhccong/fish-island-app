import { userApi } from '@/api/user';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DEFAULT_AVATARS } from '@/constants/defaultAvatars';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import { pickUserAvatar, resolveAvatarUrl } from '@/utils/userAvatar';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const router = useRouter();
  const { userInfo, refreshUserInfo } = useUser();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [userName, setUserName] = useState('');
  const [userProfile, setUserProfile] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [momentsBgUrl, setMomentsBgUrl] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState('');
  const [profileTitleId, setProfileTitleId] = useState<number | undefined>();
  const [titles, setTitles] = useState<Array<{ titleId: number; name?: string }>>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fillFromUser = useCallback(() => {
    const u = userInfo;
    if (!u) return;
    setUserName(u.userName || '');
    setUserProfile(u.userProfile || '');
    const av = u.userAvatar || '';
    if (av && (DEFAULT_AVATARS as readonly string[]).includes(av)) {
      setSelectedDefaultAvatar(av);
      setUserAvatar('');
    } else {
      setSelectedDefaultAvatar('');
      setUserAvatar(av);
    }
    setMomentsBgUrl(u.momentsBgUrl || '');
    setPreviewAvatar('');
    setProfileTitleId(u.titleId != null ? u.titleId : undefined);
  }, [userInfo]);

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      await refreshUserInfo();
      try {
        const res = await userApi.listAvailableTitles();
        if (res.code === 0 && Array.isArray(res.data)) {
          setTitles(res.data);
        }
      } catch {
        setTitles([]);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    fillFromUser();
  }, [fillFromUser]);

  const avatarPreview = useMemo(
    () =>
      previewAvatar ||
      userAvatar ||
      selectedDefaultAvatar ||
      pickUserAvatar(userInfo),
    [previewAvatar, userAvatar, selectedDefaultAvatar, userInfo],
  );

  const bgPreview = momentsBgUrl.trim();

  const pickImage = async (kind: 'avatar' | 'bg') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限请求', '需要访问相册权限才能选择图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const ext =
      asset.fileName?.split('.').pop()?.toLowerCase() ||
      asset.mimeType?.split('/').pop() ||
      'jpg';
    const fileName = asset.fileName || `profile_${Date.now()}.${ext}`;

    if (kind === 'avatar') {
      setAvatarUploading(true);
      try {
        const res = await userApi.uploadImage(asset.uri, fileName, asset.mimeType || 'image/jpeg');
        if (res.code === 0 && res.data) {
          setPreviewAvatar(res.data);
          setUserAvatar(res.data);
          setSelectedDefaultAvatar('');
        } else {
          throw new Error(res.message || res.msg || '上传失败');
        }
      } catch (e: any) {
        toast.error(e?.message || '头像上传失败');
      } finally {
        setAvatarUploading(false);
      }
      return;
    }

    setBgUploading(true);
    try {
      const res = await userApi.uploadPostImage(
        asset.uri,
        fileName,
        asset.mimeType || 'image/jpeg',
      );
      if (res.code === 0 && res.data) {
        setMomentsBgUrl(res.data);
      } else {
        throw new Error(res.message || res.msg || '上传失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '背景上传失败');
    } finally {
      setBgUploading(false);
    }
  };

  const handlePickDefaultAvatar = (url: string) => {
    setSelectedDefaultAvatar(url);
    setPreviewAvatar('');
    setUserAvatar('');
  };

  const handleTitleSelect = async (titleId: number) => {
    if (titleSaving || profileTitleId === titleId) return;
    setTitleSaving(true);
    try {
      const res = await userApi.setCurrentTitle(titleId);
      if (res.code !== 0) throw new Error(res.message || res.msg || '设置失败');
      setProfileTitleId(titleId);
      toast.success('称号已更新');
      await refreshUserInfo();
    } catch (e: any) {
      toast.error(e?.message || '称号设置失败');
    } finally {
      setTitleSaving(false);
    }
  };

  const handleSave = async () => {
    const name = userName.trim().replace(/\s/g, '');
    if (!name) {
      toast.info('请填写用户名');
      return;
    }
    setSaving(true);
    try {
      const finalAvatar =
        selectedDefaultAvatar.trim() || userAvatar.trim() || previewAvatar.trim() || undefined;
      const res = await userApi.updateMyProfile({
        userName: name,
        userProfile: userProfile.trim() || undefined,
        userAvatar: finalAvatar,
        momentsBgUrl: momentsBgUrl.trim() || undefined,
      });
      if (res.code !== 0) throw new Error(res.message || res.msg || '保存失败');
      toast.success('保存成功');
      await refreshUserInfo();
      router.back();
    } catch (e: any) {
      toast.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const inputBorder = isDark ? '#444' : '#e8e8e8';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: inputBorder }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityLabel="返回"
        >
          <IconSymbol name="chevron.left" size={22} color={theme.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          编辑资料
        </ThemedText>
        <TouchableOpacity
          style={styles.headerBtn}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.tint} />
          ) : (
            <ThemedText style={[styles.saveText, { color: theme.tint }]}>保存</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <ActivityIndicator style={styles.pageLoader} color={theme.tint} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={styles.hint}>
              与网页端一致，可修改用户名、头像、鱼小圈背景与个人简介（用户名修改规则以服务端为准）
            </ThemedText>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <ThemedText style={styles.label}>头像</ThemedText>
              <View style={styles.avatarRow}>
                <Image
                  source={{ uri: resolveAvatarUrl(avatarPreview) }}
                  style={styles.avatarPreview}
                  contentFit="cover"
                />
                <View style={styles.avatarActions}>
                  <TouchableOpacity
                    style={[styles.uploadBtn, { borderColor: theme.tint }]}
                    disabled={avatarUploading}
                    onPress={() => pickImage('avatar')}
                  >
                    <ThemedText style={[styles.uploadBtnText, { color: theme.tint }]}>
                      {avatarUploading ? '上传中…' : '从相册选择'}
                    </ThemedText>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: theme.text }]}
                    value={userAvatar}
                    onChangeText={(v) => {
                      setUserAvatar(v);
                      setPreviewAvatar('');
                      setSelectedDefaultAvatar('');
                    }}
                    placeholder="或粘贴图片 URL"
                    placeholderTextColor={isDark ? '#888' : '#aaa'}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              <ThemedText style={styles.subLabel}>默认头像</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.defAvatars}>
                {DEFAULT_AVATARS.map((url) => (
                  <TouchableOpacity
                    key={url}
                    style={[
                      styles.defAvatarItem,
                      selectedDefaultAvatar === url && styles.defAvatarActive,
                    ]}
                    onPress={() => handlePickDefaultAvatar(url)}
                  >
                    <Image source={{ uri: url }} style={styles.defAvatarImg} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <ThemedText style={styles.label}>用户名</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: theme.text }]}
                value={userName}
                onChangeText={(v) => setUserName(v.replace(/\s/g, ''))}
                maxLength={10}
                placeholder="10 字以内"
                placeholderTextColor={isDark ? '#888' : '#aaa'}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ThemedText style={styles.fieldHint}>
                新用户可免费改一次；之后每月限改且消耗积分（以服务端提示为准）
              </ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <ThemedText style={styles.label}>绑定邮箱</ThemedText>
              {userInfo?.email?.trim() ? (
                <ThemedText style={styles.emailBound}>{userInfo.email.trim()}</ThemedText>
              ) : (
                <ThemedText style={styles.fieldHint}>
                  绑定邮箱请前往网页版摸鱼岛完成验证
                </ThemedText>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <ThemedText style={styles.label}>鱼小圈背景</ThemedText>
              <View style={styles.bgRow}>
                <View style={[styles.bgPreview, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  {bgPreview ? (
                    <Image source={{ uri: resolveAvatarUrl(bgPreview) }} style={styles.bgPreviewImg} contentFit="cover" />
                  ) : (
                    <ThemedText style={styles.bgPlaceholder}>预览</ThemedText>
                  )}
                </View>
                <View style={styles.bgActions}>
                  <TouchableOpacity
                    style={[styles.uploadBtn, { borderColor: theme.tint }]}
                    disabled={bgUploading}
                    onPress={() => pickImage('bg')}
                  >
                    <ThemedText style={[styles.uploadBtnText, { color: theme.tint }]}>
                      {bgUploading ? '上传中…' : '上传背景'}
                    </ThemedText>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: theme.text }]}
                    value={momentsBgUrl}
                    onChangeText={setMomentsBgUrl}
                    placeholder="或图片地址"
                    placeholderTextColor={isDark ? '#888' : '#aaa'}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            {titles.length > 0 ? (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <ThemedText style={styles.label}>称号</ThemedText>
                <View style={styles.titleList}>
                  {titles.map((t) => {
                    const active = profileTitleId === t.titleId;
                    return (
                      <TouchableOpacity
                        key={t.titleId}
                        style={[
                          styles.titleChip,
                          { borderColor: inputBorder },
                          active && { borderColor: theme.tint, backgroundColor: `${theme.tint}18` },
                        ]}
                        disabled={titleSaving}
                        onPress={() => handleTitleSelect(t.titleId)}
                      >
                        <ThemedText
                          style={[styles.titleChipText, active && { color: theme.tint, fontWeight: '700' }]}
                        >
                          {t.name || `称号${t.titleId}`}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <ThemedText style={styles.fieldHint}>点击称号立即佩戴，与网页端同步</ThemedText>
              </View>
            ) : null}

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <ThemedText style={styles.label}>个人简介</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: inputBg, borderColor: inputBorder, color: theme.text },
                ]}
                value={userProfile}
                onChangeText={setUserProfile}
                maxLength={100}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="介绍一下自己（最多100字）"
                placeholderTextColor={isDark ? '#888' : '#aaa'}
              />
              <ThemedText style={styles.counter}>{userProfile.length}/100</ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryBtnText}>保存修改</ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17 },
  saveText: { fontSize: 16, fontWeight: '600' },
  pageLoader: { marginTop: 48 },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  hint: {
    fontSize: 13,
    opacity: 0.65,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  subLabel: { fontSize: 13, opacity: 0.6, marginTop: 12, marginBottom: 8 },
  fieldHint: { fontSize: 12, opacity: 0.55, marginTop: 8, lineHeight: 18 },
  emailBound: { fontSize: 14, color: '#52c41a', fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  textArea: { minHeight: 96, paddingTop: 12 },
  counter: { fontSize: 12, opacity: 0.45, textAlign: 'right', marginTop: 6 },
  avatarRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eee',
  },
  avatarActions: { flex: 1, gap: 8 },
  uploadBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600' },
  defAvatars: { gap: 8, paddingVertical: 4 },
  defAvatarItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  defAvatarActive: { borderColor: '#52c41a' },
  defAvatarImg: { width: '100%', height: '100%' },
  bgRow: { flexDirection: 'row', gap: 12 },
  bgPreview: {
    width: 88,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPreviewImg: { width: '100%', height: '100%' },
  bgPlaceholder: { fontSize: 12, opacity: 0.45 },
  bgActions: { flex: 1, gap: 8 },
  titleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  titleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  titleChipText: { fontSize: 13 },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
