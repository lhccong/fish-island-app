import { petApi } from '@/api/pet';
import PetEquipForgeModal from '@/components/pet/PetEquipForgeModal';
import PetImage from '@/components/PetImage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getPetId, SLOT_LABELS } from '@/utils/petConstants';
import { EQUIP_SLOT_TO_NUM } from '@/utils/petForge';
import {
  buildEquipStatRows,
  EQUIP_RARITY_COLORS,
  EQUIP_RARITY_NAMES,
} from '@/utils/petEquipDisplay';
import { getPetDisplayHeight } from '@/utils/petRender';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type OtherPetTarget = {
  userId: number | string;
  userName?: string;
};

type ModalTab = 'equipment' | 'skills';

interface OtherUserPetModalProps {
  visible: boolean;
  target: OtherPetTarget | null;
  onClose: () => void;
}

function StatusProgress({
  label,
  value,
  max,
  color,
  theme,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  theme: typeof Colors.light;
}) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.max(0, Math.min(value, safeMax));
  const pct = (safeValue / safeMax) * 100;

  return (
    <View style={styles.statusItem}>
      <Text style={[styles.statusLabel, { color: theme.text }]}>{label}</Text>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.statusValue, { color: theme.icon }]}>
        {safeValue}/{safeMax}
      </Text>
    </View>
  );
}

export default function OtherUserPetModal({ visible, target, onClose }: OtherUserPetModalProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const [petInfo, setPetInfo] = useState<any>(null);
  const [hasPet, setHasPet] = useState(true);
  const [activeTab, setActiveTab] = useState<ModalTab>('equipment');
  const [viewForgeVisible, setViewForgeVisible] = useState(false);
  const [viewForgeSlot, setViewForgeSlot] = useState<number | undefined>();
  const [viewForgeSlotName, setViewForgeSlotName] = useState('');

  const load = useCallback(async () => {
    if (!target?.userId) return;
    setLoading(true);
    setPetInfo(null);
    setHasPet(true);
    setActiveTab('equipment');
    try {
      const res = await petApi.getOtherUserPet(target.userId);
      if (res?.code === 0 && res.data) {
        setPetInfo(res.data);
        setHasPet(true);
      } else {
        setPetInfo(null);
        setHasPet(false);
      }
    } catch {
      setPetInfo(null);
      setHasPet(false);
    } finally {
      setLoading(false);
    }
  }, [target?.userId]);

  useEffect(() => {
    if (visible && target?.userId) {
      load();
    }
    if (!visible) {
      setPetInfo(null);
    }
  }, [visible, target?.userId, load]);

  const displayName = target?.userName || '用户';
  const previewSize = 100;
  const equippedEntries = Object.entries(petInfo?.equippedItems || {}).filter(([, item]) => !!item);
  const equipStatRows = buildEquipStatRows(petInfo?.equipStats);

  const maxMood = petInfo?.maxMood ?? 100;
  const maxHunger = petInfo?.maxHunger ?? 100;
  const maxExp = petInfo?.maxExp ?? 100;
  const mood = Math.floor(Number(petInfo?.mood ?? 0));
  const hunger = Math.floor(Number(petInfo?.hunger ?? 0));
  const exp = Math.floor(Number(petInfo?.exp ?? 0));

  const viewPetId = getPetId(petInfo);

  const openViewForge = (slot: string) => {
    const slotNum = EQUIP_SLOT_TO_NUM[slot];
    if (!viewPetId || !slotNum) return;
    setViewForgeSlot(slotNum);
    setViewForgeSlotName(SLOT_LABELS[slot] || slot);
    setViewForgeVisible(true);
  };

  const renderEquippedCard = ([slot, item]: [string, any]) => {
    const rarity = item?.template?.rarity || 1;
    const rarityColor = EQUIP_RARITY_COLORS[rarity] || '#8c8c8c';
    const enhanceLevel = item?.enhanceLevel || 0;

    return (
      <TouchableOpacity
        key={slot}
        style={[styles.equipCard, { borderColor: rarityColor, backgroundColor: theme.card }]}
        onPress={() => openViewForge(slot)}
        activeOpacity={0.75}
      >
        <View style={styles.equipCardRow}>
          <View style={styles.equipIconWrap}>
            {item?.template?.icon ? (
              <Image source={{ uri: item.template.icon }} style={styles.equipCardIcon} contentFit="contain" />
            ) : (
              <Text style={styles.equipCardIconPlaceholder}>⚔️</Text>
            )}
            {enhanceLevel > 0 && (
              <View style={styles.enhanceBadge}>
                <Text style={styles.enhanceBadgeText}>+{enhanceLevel}</Text>
              </View>
            )}
          </View>
          <View style={styles.equipCardMeta}>
            <Text style={[styles.equipCardName, { color: theme.text }]} numberOfLines={1}>
              {item?.template?.name || '未知装备'}
            </Text>
            <Text style={{ fontSize: 12, color: rarityColor }}>
              {SLOT_LABELS[slot] || slot} · {EQUIP_RARITY_NAMES[rarity] || '未知'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.titleRow}>
            <Text style={styles.titleIcon}>🐟</Text>
            <Text style={[styles.title, { color: theme.text }]}>{displayName} 的宠物</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={[styles.closeIcon, { color: theme.icon }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.tint} style={{ marginVertical: 48 }} />
          ) : !hasPet || !petInfo ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48 }}>😊</Text>
              <Text style={[styles.emptyText, { color: theme.icon }]}>
                该用户还没有养宠物哦~
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.petInfoRow, { borderBottomColor: theme.border }]}>
                <View style={{ height: getPetDisplayHeight(previewSize) }}>
                  <PetImage url={petInfo.petUrl} size={previewSize} autoPlay />
                </View>
                <View style={styles.petDetails}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.petName, { color: theme.text }]} numberOfLines={1}>
                      {petInfo.name || '未命名宠物'}
                    </Text>
                    <Text style={[styles.levelBadge, { color: theme.tint }]}>
                      Lv.{petInfo.level || 1}
                    </Text>
                  </View>
                  <StatusProgress label="❤️ 心情" value={mood} max={maxMood} color="#ff7875" theme={theme} />
                  <StatusProgress label="⚡ 饥饿" value={hunger} max={maxHunger} color="#52c41a" theme={theme} />
                  <StatusProgress label="📈 经验" value={exp} max={maxExp} color="#1890ff" theme={theme} />
                </View>
              </View>

              <View style={[styles.tabBar, { backgroundColor: theme.background }]}>
                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'equipment' && {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.tint,
                    },
                  ]}
                  onPress={() => setActiveTab('equipment')}
                >
                  <Text style={{ color: activeTab === 'equipment' ? theme.tint : theme.icon, fontWeight: '600' }}>
                    装备
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'skills' && {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.tint,
                    },
                  ]}
                  onPress={() => setActiveTab('skills')}
                >
                  <Text style={{ color: activeTab === 'skills' ? theme.tint : theme.icon, fontWeight: '600' }}>
                    技能
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
                {activeTab === 'equipment' ? (
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>已装备物品</Text>
                    <Text style={[styles.equipTapHint, { color: theme.icon }]}>
                      点击装备可查看词条
                    </Text>
                    {equippedEntries.length === 0 ? (
                      <View style={styles.emptyEquip}>
                        <Text style={{ fontSize: 32 }}>🎒</Text>
                        <Text style={{ color: theme.icon, fontSize: 14 }}>暂无装备</Text>
                      </View>
                    ) : (
                      <View style={styles.equipGrid}>{equippedEntries.map(renderEquippedCard)}</View>
                    )}

                    {equipStatRows.length > 0 && (
                      <View style={styles.statsSection}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>装备属性加成</Text>
                        <View style={styles.statsGrid}>
                          {equipStatRows.map((row) => (
                            <View key={row.label} style={styles.statCol}>
                              <Text style={[styles.statRowText, { color: theme.text }]} numberOfLines={2}>
                                {row.icon} {row.text}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.skillsEmpty}>
                    <Text style={{ fontSize: 40 }}>⚡</Text>
                    <Text style={[styles.emptyText, { color: theme.icon }]}>
                      技能系统即将开放，敬请期待！
                    </Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}

          {hasPet && !loading && target?.userId != null && (
            <TouchableOpacity
              style={[styles.battleBtn, { borderColor: theme.tint }]}
              onPress={() => {
                const uid = target.userId;
                onClose();
                router.push(`/pet/fight?opponentUserId=${uid}`);
              }}
            >
              <Text style={[styles.battleBtnText, { color: theme.tint }]}>⚔️ 发起对战</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.tint }]}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PetEquipForgeModal
        visible={viewForgeVisible}
        petId={viewPetId}
        equipSlot={viewForgeSlot}
        slotName={viewForgeSlotName}
        readOnly
        onClose={() => {
          setViewForgeVisible(false);
          setViewForgeSlot(undefined);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  titleIcon: { fontSize: 20 },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
  closeIcon: { fontSize: 20, padding: 4 },
  petInfoRow: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  petDetails: { flex: 1, minWidth: 0, gap: 8 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  petName: { fontSize: 16, fontWeight: '700', flex: 1 },
  levelBadge: { fontSize: 14, fontWeight: '700' },
  statusItem: { gap: 4 },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  statusValue: { fontSize: 11, textAlign: 'right' },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabScroll: { maxHeight: 320 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  equipTapHint: { fontSize: 12, marginBottom: 10 },
  equipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  equipCard: {
    width: '47%',
    borderRadius: 8,
    borderWidth: 2,
    padding: 10,
  },
  equipCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  equipIconWrap: { position: 'relative' },
  equipCardIcon: { width: 36, height: 36 },
  equipCardIconPlaceholder: { fontSize: 28, width: 36, textAlign: 'center' },
  enhanceBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ff4d4f',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  enhanceBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  equipCardMeta: { flex: 1, minWidth: 0 },
  equipCardName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  emptyEquip: { alignItems: 'center', paddingVertical: 24, gap: 8, marginBottom: 16 },
  statsSection: { marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCol: {
    width: '48%',
  },
  statRowText: { fontSize: 13, lineHeight: 20 },
  skillsEmpty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  battleBtn: {
    marginTop: 14,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  battleBtnText: { fontWeight: '700', fontSize: 15 },
  closeBtn: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
