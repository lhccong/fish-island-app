import type { CropDTO } from '@/api/farm';
import CropIcon from '@/components/farm/CropIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CATEGORY_LABEL } from '@/utils/farmUtils';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PlantCropModalProps {
  visible: boolean;
  title: string;
  crops: CropDTO[];
  emptyLandCount: number;
  selectedLandCount: number;
  planting: boolean;
  onClose: () => void;
  onPlant: (cropId: number) => void;
  onTogglePlantAll?: (plantAll: boolean) => void;
  plantAllSelected?: boolean;
  showBatchToggle?: boolean;
}

export default function PlantCropModal({
  visible,
  title,
  crops,
  emptyLandCount,
  selectedLandCount,
  planting,
  onClose,
  onPlant,
  onTogglePlantAll,
  plantAllSelected = false,
  showBatchToggle = false,
}: PlantCropModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    crops.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['all', ...Array.from(set)];
  }, [crops]);

  const filteredCrops = useMemo(() => {
    if (activeCategory === 'all') return crops;
    return crops.filter((c) => c.category === activeCategory);
  }, [crops, activeCategory]);

  const handleClose = () => {
    setSelectedCropId(null);
    setActiveCategory('all');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {showBatchToggle && emptyLandCount > 1 && onTogglePlantAll ? (
            <TouchableOpacity
              style={styles.batchRow}
              onPress={() => onTogglePlantAll(!plantAllSelected)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, plantAllSelected && styles.checkboxOn]}>
                {plantAllSelected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={[styles.batchText, { color: theme.text }]}>
                播种全部空地（{emptyLandCount} 块）
              </Text>
            </TouchableOpacity>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catBtn,
                  activeCategory === cat && styles.catBtnActive,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.catText,
                    { color: activeCategory === cat ? '#389e0d' : theme.icon },
                    activeCategory === cat && styles.catTextActive,
                  ]}
                >
                  {cat === 'all' ? '全部' : CATEGORY_LABEL[cat] ?? cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.cropList} showsVerticalScrollIndicator={false}>
            {filteredCrops.length === 0 ? (
              <Text style={[styles.empty, { color: theme.icon }]}>暂无可用作物</Text>
            ) : (
              filteredCrops.map((crop) => {
                const locked = crop.locked === true;
                const selected = selectedCropId === crop.id;
                return (
                  <TouchableOpacity
                    key={crop.id}
                    style={[
                      styles.cropCard,
                      { borderColor: '#f0f0f0', backgroundColor: '#fff' },
                      selected && styles.cropCardSelected,
                      locked && styles.cropLocked,
                    ]}
                    disabled={locked}
                    onPress={() => crop.id != null && setSelectedCropId(crop.id)}
                  >
                    <CropIcon crop={crop} size={36} />
                    <View style={styles.cropInfo}>
                      <Text style={[styles.cropName, { color: theme.text }]}>{crop.name}</Text>
                      <Text style={[styles.cropMeta, { color: theme.icon }]}>
                        {crop.growthTime ?? 0} 分钟 · +{crop.coin ?? 0} 积分
                      </Text>
                      {locked ? (
                        <Text style={styles.lockTag}>Lv.{crop.unlockLevel} 解锁</Text>
                      ) : null}
                    </View>
                    {selected ? <Text style={styles.selectedMark}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={handleClose}>
              <Text style={{ color: theme.text }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn]}
              disabled={selectedCropId == null || planting}
              onPress={() => selectedCropId != null && onPlant(selectedCropId)}
            >
              <Text style={styles.confirmText}>
                {planting
                  ? '播种中…'
                  : selectedLandCount > 1
                    ? `播种 ${selectedLandCount} 块地`
                    : '开始种植'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '85%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#52c41a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#52c41a',
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  batchText: {
    fontSize: 14,
    flex: 1,
  },
  catScroll: {
    marginBottom: 12,
    maxHeight: 40,
  },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cropList: {
    maxHeight: 280,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  cropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  cropLocked: {
    opacity: 0.55,
  },
  cropInfo: {
    flex: 1,
    minWidth: 0,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '600',
  },
  cropMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  lockTag: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  catBtnActive: {
    backgroundColor: '#f6ffed',
    borderColor: '#52c41a',
  },
  catTextActive: {
    fontWeight: '600',
  },
  cropCardSelected: {
    borderColor: '#52c41a',
    borderWidth: 2,
    backgroundColor: '#f6ffed',
  },
  confirmBtn: {
    backgroundColor: '#52c41a',
  },
  selectedMark: {
    color: '#52c41a',
    fontSize: 18,
    fontWeight: '700',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
