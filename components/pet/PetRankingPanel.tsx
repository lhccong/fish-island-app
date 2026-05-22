import { petApi } from '@/api/pet';
import PetImage from '@/components/PetImage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type PetRankRow = {
  rank?: number;
  petId?: number;
  petUrl?: string;
  name?: string;
  userId?: number;
  userName?: string;
  level?: number;
};

interface PetRankingPanelProps {
  onViewOtherPet?: (row: PetRankRow) => void;
}

export default function PetRankingPanel({ onViewOtherPet }: PetRankingPanelProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await petApi.getPetRankList({ limit: 20 });
      setList(res?.code === 0 ? res.data || [] : []);
    } catch {
      setList([]);
      toast.error('加载排行榜失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <ActivityIndicator color={theme.tint} style={styles.loader} />;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.tip, { color: theme.icon }]}>点击宠物可查看详细信息</Text>
      <FlatList
        data={list}
        keyExtractor={(item, index) => String(item.petId ?? item.userId ?? index)}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => item.userId != null && onViewOtherPet?.(item)}
            activeOpacity={0.85}
          >
            <Text style={[styles.rank, { color: theme.tint }]}>{item.rank ?? index + 1}</Text>
            <PetImage url={item.petUrl} size={36} autoPlay={false} />
            <View style={styles.meta}>
              <Text style={[styles.petName, { color: theme.text }]} numberOfLines={1}>
                {item.name || '未知宠物'}
              </Text>
              <Text style={[styles.owner, { color: theme.icon }]} numberOfLines={1}>
                {item.userName || '未知用户'}
              </Text>
            </View>
            <Text style={[styles.level, { color: theme.text }]}>Lv.{item.level ?? '--'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.icon }]}>暂无排行数据</Text>
        }
        contentContainerStyle={list.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  loader: { marginTop: 40 },
  tip: { fontSize: 12, marginBottom: 10, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 10,
  },
  rank: { width: 28, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  meta: { flex: 1, minWidth: 0 },
  petName: { fontSize: 14, fontWeight: '600' },
  owner: { fontSize: 12, marginTop: 2 },
  level: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  viewBtnText: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
});
