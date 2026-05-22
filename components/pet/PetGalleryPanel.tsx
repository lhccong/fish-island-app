import { petApi } from '@/api/pet';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { categoryText, RARITY_COLORS, rarityText } from '@/utils/petConstants';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CATEGORIES = [
  { key: undefined, label: '全部' },
  { key: 'equipment', label: '装备' },
  { key: 'consumable', label: '消耗品' },
  { key: 'material', label: '材料' },
] as const;

export default function PetGalleryPanel() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await petApi.listItemTemplates({
        current: page,
        pageSize,
        category,
      });
      if (res?.code === 0) {
        setItems(res.data?.records || []);
        setTotal(res.data?.total || 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.label}
            style={[
              styles.filterBtn,
              { borderColor: theme.border },
              category === c.key && { backgroundColor: theme.tint, borderColor: theme.tint },
            ]}
            onPress={() => {
              setPage(1);
              setCategory(c.key);
            }}
          >
            <Text
              style={[
                styles.filterText,
                { color: category === c.key ? '#fff' : theme.text },
              ]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.tint} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                {item.icon ? (
                  <Image source={{ uri: item.icon }} style={styles.icon} contentFit="contain" />
                ) : (
                  <Text style={styles.iconPlaceholder}>
                    {item.category === 'equipment' ? '⚔️' : item.category === 'consumable' ? '🧪' : '💎'}
                  </Text>
                )}
                <View
                  style={[
                    styles.rarityBadge,
                    { backgroundColor: RARITY_COLORS[item.rarity || 1] || '#8c8c8c' },
                  ]}
                >
                  <Text style={styles.rarityText}>{rarityText(item.rarity)}</Text>
                </View>
              </View>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {item.name || '未知物品'}
              </Text>
              <Text style={[styles.meta, { color: theme.icon }]}>
                {categoryText(item.category)}
              </Text>
              {item.description ? (
                <Text style={[styles.desc, { color: theme.icon }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.icon }]}>暂无图鉴数据</Text>
          }
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
        />
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          >
            <Text style={{ color: theme.text }}>上一页</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.icon }}>
            {page}/{totalPages}
          </Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => setPage((p) => p + 1)}
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          >
            <Text style={{ color: theme.text }}>下一页</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  filters: { maxHeight: 44, marginBottom: 10 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  loader: { marginTop: 40 },
  gridRow: { gap: 10, marginBottom: 10 },
  listContent: { paddingBottom: 16 },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    minHeight: 140,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  icon: { width: 40, height: 40 },
  iconPlaceholder: { fontSize: 28 },
  rarityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  rarityText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  name: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 11, marginBottom: 4 },
  desc: { fontSize: 11, lineHeight: 15 },
  empty: { textAlign: 'center', marginTop: 40 },
  emptyContainer: { flexGrow: 1 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  pageBtn: { padding: 8 },
  pageBtnDisabled: { opacity: 0.4 },
});
