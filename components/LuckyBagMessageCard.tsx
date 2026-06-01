import LuckyBagDetailModal from '@/components/LuckyBagDetailModal';
import { LUCKY_BAG_IMAGE, parseLuckyBagInline } from '@/utils/luckyBag';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LuckyBagMessageCardProps {
  content?: string;
  md?: string;
}

export default function LuckyBagMessageCard({ content, md }: LuckyBagMessageCardProps) {
  const parsed = useMemo(() => parseLuckyBagInline(content || md), [content, md]);
  const [modalVisible, setModalVisible] = useState(false);

  if (!parsed?.luckyBagId) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>福袋</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.inline}>
        {parsed.prefix ? <Text style={styles.prefix}>{parsed.prefix}</Text> : null}
        <TouchableOpacity style={styles.trigger} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Image source={{ uri: LUCKY_BAG_IMAGE }} style={styles.image} contentFit="contain" />
          <Text style={styles.triggerText}>点击参与福袋</Text>
        </TouchableOpacity>
      </View>
      <LuckyBagDetailModal
        visible={modalVisible}
        luckyBagId={parsed.luckyBagId}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inline: {
    gap: 8,
  },
  prefix: {
    fontSize: 14,
    lineHeight: 20,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#ffd591',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  image: {
    width: 56,
    height: 56,
  },
  triggerText: {
    color: '#d46b08',
    fontSize: 15,
    fontWeight: '600',
  },
  fallback: {
    padding: 8,
  },
  fallbackText: {
    color: '#d46b08',
    fontWeight: '600',
  },
});
