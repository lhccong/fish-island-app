/* eslint-disable react-native/no-inline-styles */
import { BASE_URL } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { request } from '@/utils/request';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublish: (content: string, images: string[], location: string) => Promise<void>;
  theme: typeof Colors['light'];
}

export default function MomentPublishModal({ visible, onClose, onPublish, theme }: Props) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [publishing, setPublishing] = useState(false);
  const s = styles(theme);

  const reset = () => { setContent(''); setImages([]); setLocation(''); };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...uris].slice(0, 9));
    }
  };

  const handlePublish = async () => {
    if (!content.trim() && !images.length) return;
    setPublishing(true);
    try {
      // upload images
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        try {
          const fileName = uri.split('/').pop() || 'image.jpg';
          const tokenName = await request.getTokenName();
          const tokenValue = await request.getTokenValue();
          const apiKey = await request.getApiKey();
          const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeMap: Record<string, string> = { png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
          const formData = new FormData();
          formData.append('file', { uri, type: mimeMap[ext] || 'image/jpeg', name: fileName } as any);
          let url = `${BASE_URL}/api/file/minio/upload?biz=user_post`;
          const headers: Record<string, string> = {};
          if (tokenName && tokenValue) headers[tokenName] = tokenValue;
          else if (apiKey) url += `&apiKey=${apiKey}`;
          const resp = await fetch(url, { method: 'POST', headers, body: formData as any });
          const json = await resp.json();
          if (json.code === 0 && json.data) uploadedUrls.push(json.data);
        } catch {}
      }
      await onPublish(content, uploadedUrls, location);
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('发布失败', e?.message || '请稍后重试');
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = !!(content.trim() || images.length);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={s.overlay} onPress={onClose}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.handle} />
            <Text style={s.title}>发布鱼小圈</Text>
            <TextInput
              style={s.textarea}
              value={content}
              onChangeText={setContent}
              placeholder="分享新鲜事..."
              placeholderTextColor={theme.icon}
              multiline
              maxLength={500}
              autoFocus
            />
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {images.map((uri, i) => (
                    <View key={i} style={s.imgWrap}>
                      <Image source={{ uri }} style={s.imgThumb} />
                      <TouchableOpacity style={s.imgRemove} onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                        <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            <TextInput
              style={s.locationInput}
              value={location}
              onChangeText={setLocation}
              placeholder="📍 位置（选填）"
              placeholderTextColor={theme.icon}
              maxLength={50}
            />
            <View style={s.footer}>
              <TouchableOpacity onPress={pickImage} style={s.imgBtn}>
                <Text style={s.imgBtnText}>🖼 图片</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.publishBtn, !canPublish && { opacity: 0.4 }]}
                onPress={handlePublish}
                disabled={!canPublish || publishing}
              >
                {publishing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.publishBtnText}>发布</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (theme: typeof Colors['light']) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 14 },
  textarea: {
    minHeight: 100, fontSize: 15, color: theme.text, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, padding: 12, textAlignVertical: 'top', marginBottom: 12,
  },
  locationInput: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: theme.text, marginBottom: 14,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  imgBtn: { padding: 8 },
  imgBtnText: { fontSize: 14, color: theme.icon },
  imgWrap: { position: 'relative' },
  imgThumb: { width: 72, height: 72, borderRadius: 8 },
  imgRemove: {
    position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  publishBtn: { backgroundColor: theme.tint, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  publishBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
