import { itemInstancesApi } from '@/api/itemInstances';
import { normalizeSkinList, petSkinApi } from '@/api/petSkin';
import { userApi } from '@/api/user';
import PetImage from '@/components/PetImage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildEquipStatRows,
  EQUIP_RARITY_COLORS,
  getEnhanceTier,
} from '@/utils/petEquipDisplay';
import {
  getPetId,
  LEFT_EQUIP_SLOTS,
  RARITY_COLORS,
  RIGHT_EQUIP_SLOTS,
} from '@/utils/petConstants';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type InnerTab = 'items' | 'shop' | 'owned' | 'skills';

interface MyPetPanelProps {
  petInfo: any;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onPetUpdated: (pet: any) => void;
}

export default function MyPetPanel({
  petInfo,
  loading,
  onRefresh,
  onPetUpdated,
}: MyPetPanelProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [innerTab, setInnerTab] = useState<InnerTab>('items');
  const [actionLoading, setActionLoading] = useState<'pat' | 'feed' | null>(null);
  const [bagLoading, setBagLoading] = useState(false);
  const [bagItems, setBagItems] = useState<any[]>([]);
  const [equipLoadingId, setEquipLoadingId] = useState<string | number | null>(null);
  const [unequipSlot, setUnequipSlot] = useState('');
  const [decomposeId, setDecomposeId] = useState<string | number | null>(null);
  const [skinLoading, setSkinLoading] = useState(false);
  const [skins, setSkins] = useState<any[]>([]);
  const [exchangeId, setExchangeId] = useState<string | number | null>(null);
  const [setSkinId, setSetSkinId] = useState<string | number | null>(null);
  const [shopSubType, setShopSubType] = useState<'skin' | 'props'>('skin');
  const [itemsCategory, setItemsCategory] = useState<string | undefined>(undefined);
  const [batchDecomposeLoading, setBatchDecomposeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const ITEM_CATEGORIES = [
    { key: undefined as string | undefined, label: '全部' },
    { key: 'equipment', label: '装备' },
    { key: 'consumable', label: '消耗品' },
    { key: 'material', label: '材料' },
  ];

  const petId = getPetId(petInfo);
  const previewSize = 140;

  const maxMood = petInfo?.maxMood ?? 100;
  const maxHunger = petInfo?.maxHunger ?? 100;
  const maxExp = petInfo?.maxExp ?? 100;
  const mood = Math.floor(Number(petInfo?.mood ?? 0));
  const hunger = Math.floor(Number(petInfo?.hunger ?? 0));
  const exp = Math.floor(Number(petInfo?.exp ?? 0));
  const powerScore = Math.floor((petInfo?.level || 1) * 100 + mood + hunger);
  const equipStatRows = useMemo(() => buildEquipStatRows(petInfo?.equipStats), [petInfo?.equipStats]);

  const loadBag = useCallback(async () => {
    setBagLoading(true);
    try {
      const res = await itemInstancesApi.listMyItemInstances({
        current: 1,
        pageSize: 30,
        ...(itemsCategory ? { category: itemsCategory } : {}),
      });
      setBagItems(res?.code === 0 ? res.data?.records || [] : []);
    } catch {
      setBagItems([]);
    } finally {
      setBagLoading(false);
    }
  }, [itemsCategory]);

  const loadSkins = useCallback(async () => {
    setSkinLoading(true);
    try {
      const res = await petSkinApi.listPetSkins();
      let list = normalizeSkinList(res);
      const petUrl = petInfo?.petUrl;
      const hasMinusOne = list.some((s: any) => s.skinId === -1);
      const apiShowsCurrent = !!(petUrl && list.some((s: any) => s.url === petUrl));
      if (!hasMinusOne && petUrl && !apiShowsCurrent) {
        list = [
          {
            skinId: -1,
            name: '原皮',
            description: '最初的样子，朴素而自然',
            url: petUrl,
            points: 0,
            owned: true,
          },
          ...list,
        ];
      }
      setSkins(list);
    } catch {
      setSkins([]);
    } finally {
      setSkinLoading(false);
    }
  }, [petInfo?.petUrl]);

  useEffect(() => {
    if (petInfo) {
      loadBag();
      loadSkins();
    }
  }, [petInfo, loadBag, loadSkins]);

  const getEquippedItem = (slot: string) => {
    const equipped = petInfo?.equippedItems || {};
    if (slot === 'wing') {
      return equipped.wing || equipped.accessory2 || null;
    }
    return equipped[slot] || null;
  };

  const equippedList = useMemo(() => {
    const equipped = petInfo?.equippedItems || {};
    return Object.entries(equipped).filter(([, item]) => !!item);
  }, [petInfo?.equippedItems]);

  const isEquipped = (itemId: string | number) =>
    equippedList.some(([, item]: any) => item?.id === itemId);

  const isSkinCurrent = (skin: any) => {
    if (!skin) return false;
    const curId = petInfo?.skinId ?? petInfo?.currentSkinId;
    if (curId != null && skin.skinId != null) {
      return Number(skin.skinId) === Number(curId);
    }
    const petUrl = petInfo?.petUrl;
    const urlMatches = (s: any) => {
      if (s.skinId === -1) return !petUrl || petUrl === s.url;
      return !!petUrl && petUrl === s.url;
    };
    if (!urlMatches(skin)) return false;
    const hasNonDefault = skins.some(
      (s) => s.skinId != null && s.skinId !== -1 && petUrl && s.url === petUrl,
    );
    if (skin.skinId === -1) {
      return !hasNonDefault && (!petUrl || petUrl === skin.url);
    }
    return !!petUrl && petUrl === skin.url;
  };

  const ownedSkins = useMemo(() => skins.filter((s) => s.owned), [skins]);

  const handlePatFeed = async (action: 'pat' | 'feed') => {
    if (!petId || actionLoading) return;
    setActionLoading(action);
    try {
      const res = action === 'pat' ? await userApi.patPet(petId) : await userApi.feedPet(petId);
      if (res?.code === 0) {
        toast.success(action === 'pat' ? '抚摸成功，宠物更开心啦~' : '喂食成功，宠物吃饱啦~');
        if (res.data && typeof res.data === 'object') {
          onPetUpdated({ ...petInfo, ...res.data });
        }
        await onRefresh();
      } else {
        toast.error(res?.message || res?.msg || '操作失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnequip = async (slot: string) => {
    if (!slot || unequipSlot) return;
    const actualSlot =
      slot === 'wing'
        ? petInfo?.equippedItems?.wing
          ? 'wing'
          : petInfo?.equippedItems?.accessory2
            ? 'accessory2'
            : slot
        : slot;
    setUnequipSlot(slot);
    try {
      const res = await itemInstancesApi.unequipItem(actualSlot);
      if (res?.code === 0) {
        toast.success('卸下成功');
        await Promise.all([onRefresh(), loadBag()]);
      } else {
        toast.error(res?.message || res?.msg || '卸下失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '卸下失败');
    } finally {
      setUnequipSlot('');
    }
  };

  const handleEquip = async (item: any) => {
    if (!item?.id || equipLoadingId) return;
    setEquipLoadingId(item.id);
    try {
      const res = await itemInstancesApi.equipItem(item.id);
      if (res?.code === 0) {
        toast.success('穿戴成功');
        await Promise.all([onRefresh(), loadBag()]);
      } else {
        toast.error(res?.message || res?.msg || '穿戴失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '穿戴失败');
    } finally {
      setEquipLoadingId(null);
    }
  };

  const handleBatchDecompose = () => {
    Alert.alert(
      '确认批量分解',
      '确定要批量分解所有蓝色（精良）和绿色（优良）品质的装备吗？\n\n已穿戴的装备不会被分解。\n此操作不可撤销！',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认分解',
          style: 'destructive',
          onPress: async () => {
            setBatchDecomposeLoading(true);
            try {
              const res = await itemInstancesApi.batchDecomposeBlueGreen();
              if (res?.code === 0) {
                const points = res.data ?? 0;
                toast.success(`批量分解成功，共获得 ${points} 积分`);
                await Promise.all([loadBag(), onRefresh()]);
              } else {
                toast.error(res?.message || res?.msg || '批量分解失败');
              }
            } catch (e: any) {
              toast.error(e?.message || '批量分解失败');
            } finally {
              setBatchDecomposeLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDecompose = (item: any) => {
    if (!item?.id) return;
    Alert.alert('确认分解', `确定分解「${item?.template?.name || '该物品'}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '分解',
        style: 'destructive',
        onPress: async () => {
          setDecomposeId(item.id);
          try {
            const res = await itemInstancesApi.decomposeItem(item.id);
            if (res?.code === 0) {
              toast.success('分解成功');
              await loadBag();
            } else {
              toast.error(res?.message || res?.msg || '分解失败');
            }
          } catch (e: any) {
            toast.error(e?.message || '分解失败');
          } finally {
            setDecomposeId(null);
          }
        },
      },
    ]);
  };

  const handleExchangeSkin = (skin: any) => {
    const skinId = skin?.skinId ?? skin?.id;
    if (skinId == null) return;
    Alert.alert(
      '确认购买',
      `确定花费 ${skin?.points ?? 0} 积分购买「${skin?.name || '该宠物'}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '购买',
          onPress: async () => {
            setExchangeId(skinId);
            try {
              const res = await petSkinApi.exchangePetSkin(skinId);
              if (res?.code === 0) {
                toast.success('购买成功');
                await Promise.all([onRefresh(), loadSkins()]);
              } else {
                toast.error(res?.message || res?.msg || '购买失败');
              }
            } catch (e: any) {
              toast.error(e?.message || '购买失败');
            } finally {
              setExchangeId(null);
            }
          },
        },
      ],
    );
  };

  const handleSetSkin = async (skin: any) => {
    const skinId = skin?.skinId ?? skin?.id;
    if (skinId == null || setSkinId) return;
    setSetSkinId(skinId);
    try {
      const res = await petSkinApi.setPetSkin(skinId);
      if (res?.code === 0) {
        toast.success('切换成功');
        const payload = res.data;
        if (payload && typeof payload === 'object') {
          onPetUpdated({ ...petInfo, ...payload });
        }
        await Promise.all([onRefresh(), loadSkins()]);
      } else {
        toast.error(res?.message || res?.msg || '切换失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '切换失败');
    } finally {
      setSetSkinId(null);
    }
  };

  const onPullRefresh = async () => {
    setRefreshing(true);
    await Promise.all([onRefresh(), loadBag(), loadSkins()]);
    setRefreshing(false);
  };

  const showPetRules = () => {
    Alert.alert(
      '宠物系统说明',
      '经验：每小时 +1，满 100 升一级；饥饿/心情为 0 时不涨经验。\n\n互动：喂食消耗 5 积分，抚摸消耗 3 积分，均有冷却。\n\n改名：消耗 100 积分，名称最多 10 字。',
    );
  };

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error('请输入宠物名称');
      return;
    }
    if (trimmed.length > 10) {
      toast.error('名称最多 10 个字符');
      return;
    }
    setRenameLoading(true);
    try {
      const res = await userApi.updatePetName(trimmed, petId);
      if (res?.code === 0) {
        toast.success('改名成功');
        onPetUpdated({ ...petInfo, name: trimmed });
        setIsRenaming(false);
        setNewName('');
        await onRefresh();
      } else {
        toast.error(res?.message || res?.msg || '改名失败');
      }
    } catch (e: any) {
      toast.error(e?.message || '改名失败');
    } finally {
      setRenameLoading(false);
    }
  };

  const renderSlot = (slot: { key: string; label: string; icon: string }) => {
    const equipped = getEquippedItem(slot.key);
    const loadingSlot = unequipSlot === slot.key;
    const rarity = equipped?.template?.rarity || 0;
    const borderColor = equipped
      ? EQUIP_RARITY_COLORS[rarity] || EQUIP_RARITY_COLORS[1]
      : theme.border;
    const enhanceLevel = equipped?.enhanceLevel || 0;

    return (
      <TouchableOpacity
        key={slot.key}
        style={[
          styles.equipSlot,
          { backgroundColor: theme.background, borderColor },
          equipped && styles.equipSlotFilled,
        ]}
        onPress={() => equipped && handleUnequip(slot.key)}
        disabled={!equipped || loadingSlot}
        activeOpacity={equipped ? 0.7 : 1}
      >
        {equipped?.template?.icon ? (
          <View style={styles.slotIconWrap}>
            <Image source={{ uri: equipped.template.icon }} style={styles.slotIcon} contentFit="contain" />
            {enhanceLevel > 0 && (
              <View
                style={[
                  styles.enhanceBadge,
                  getEnhanceTier(enhanceLevel) >= 4 && styles.enhanceBadgeHigh,
                ]}
              >
                <Text style={styles.enhanceBadgeText}>+{enhanceLevel}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.slotEmoji}>{slot.icon}</Text>
        )}
        {loadingSlot && (
          <View style={styles.slotLoading}>
            <ActivityIndicator size="small" color={theme.tint} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const StatusProgress = ({
    label,
    value,
    max,
    color,
  }: {
    label: string;
    value: number;
    max: number;
    color: string;
  }) => {
    const safeMax = max > 0 ? max : 100;
    const safeValue = Math.max(0, Math.min(value, safeMax));
    const pct = (safeValue / safeMax) * 100;
    return (
      <View style={styles.statusItem}>
        <Text style={[styles.statusLabel, { color: theme.text }]}>{label}</Text>
        <View style={[styles.statusTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.statusFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.statusValue, { color: theme.icon }]}>
          {safeValue}/{safeMax}
        </Text>
      </View>
    );
  };

  const renderSkinCard = (skin: any, ownedOnly = false) => {
    const skinId = skin.skinId ?? skin.id;
    const current = isSkinCurrent(skin);
    return (
      <View
        key={String(skinId)}
        style={[styles.skinCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.skinCover}>
          <PetImage url={skin.url} size={72} autoPlay />
          {current && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>当前</Text>
            </View>
          )}
        </View>
        <Text style={[styles.skinName, { color: theme.text }]} numberOfLines={1}>
          {skin.name || '未知宠物'}
        </Text>
        <Text style={[styles.skinDesc, { color: theme.icon }]} numberOfLines={2}>
          {skin.description || '暂无描述'}
        </Text>
        {!ownedOnly && (
          <Text style={[styles.skinPrice, { color: theme.tint }]}>{skin.points ?? 0} 积分</Text>
        )}
        <View style={styles.skinActions}>
          {skin.owned || ownedOnly ? (
            <TouchableOpacity
              style={[styles.skinBtn, current && styles.skinBtnDisabled]}
              onPress={() => !current && handleSetSkin(skin)}
              disabled={current || setSkinId === skinId}
            >
              {setSkinId === skinId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.skinBtnText}>{current ? '使用中' : '使用'}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.skinBtn}
              onPress={() => handleExchangeSkin(skin)}
              disabled={exchangeId === skinId}
            >
              {exchangeId === skinId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.skinBtnText}>购买</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !petInfo) {
    return <ActivityIndicator color={theme.tint} style={styles.loader} />;
  }

  if (!petInfo) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={{ fontSize: 48 }}>🐾</Text>
        <Text style={[styles.emptyText, { color: theme.icon }]}>暂未拥有宠物，敬请期待新活动~</Text>
      </View>
    );
  }

  const innerTabs: { key: InnerTab; label: string }[] = [
    { key: 'items', label: '物品' },
    { key: 'skills', label: '技能' },
    { key: 'shop', label: '商店' },
    { key: 'owned', label: '宠物馆' },
  ];

  const renderInnerTabs = () => (
    <View style={[styles.innerTabBar, { backgroundColor: theme.background }]}>
      {innerTabs.map((tab) => {
        const active = innerTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.innerTabItem,
              active && {
                backgroundColor: theme.card,
                borderBottomColor: theme.tint,
              },
            ]}
            onPress={() => setInnerTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.innerTabText,
                { color: active ? theme.tint : theme.icon },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.panelRoot}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={theme.tint} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
      <View style={[styles.displayCard, { backgroundColor: theme.card }]}>
        <View style={styles.displayHeader}>
          <TouchableOpacity onPress={showPetRules} hitSlop={8}>
            <Text style={{ color: theme.tint, fontSize: 12 }}>❓ 系统说明</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameRow}>
          {isRenaming ? (
            <View style={styles.renameBlock}>
              <TextInput
                style={[styles.renameInput, { color: theme.text, borderColor: theme.border }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="新名称（最多10字）"
                placeholderTextColor={theme.icon}
                maxLength={10}
                autoFocus
              />
              <View style={styles.renameActions}>
                <TouchableOpacity
                  style={[styles.renameBtn, { backgroundColor: theme.tint }]}
                  onPress={handleRename}
                  disabled={renameLoading}
                >
                  {renameLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.renameBtnText}>确定</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.renameBtn, styles.renameBtnCancel]}
                  onPress={() => {
                    setIsRenaming(false);
                    setNewName('');
                  }}
                >
                  <Text style={[styles.renameBtnText, { color: theme.text }]}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNewName(petInfo.name || '');
                setIsRenaming(true);
              }}
            >
              <Text style={[styles.petTitle, { color: theme.text }]}>
                {petInfo.name || '未命名宠物'} ✏️
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.powerScore}>
            <Text style={styles.powerIcon}>⚡</Text>
            <Text style={[styles.powerText, { color: theme.text }]}>{powerScore}</Text>
          </View>
        </View>

        <View style={styles.equipLayout}>
          <View style={styles.equipColumn}>{LEFT_EQUIP_SLOTS.map(renderSlot)}</View>
          <View style={styles.previewCenter}>
            <PetImage url={petInfo.petUrl} size={previewSize} autoPlay />
            <Text style={[styles.levelText, { color: theme.text }]}>Lv.{petInfo.level || 1}</Text>
            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={[styles.avatarActionBtn, { backgroundColor: theme.tint }]}
                onPress={() => handlePatFeed('feed')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'feed' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.avatarActionText}>喂食</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarActionBtn, styles.avatarActionBtnPat]}
                onPress={() => handlePatFeed('pat')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'pat' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.avatarActionText}>抚摸</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.equipColumn}>{RIGHT_EQUIP_SLOTS.map(renderSlot)}</View>
        </View>

        <View style={styles.statusSection}>
          <StatusProgress label="❤️ 心情" value={mood} max={maxMood} color="#ff7875" />
          <StatusProgress label="⚡ 饥饿" value={hunger} max={maxHunger} color="#52c41a" />
          <StatusProgress label="✨ 经验" value={exp} max={maxExp} color="#ffa768" />
        </View>

        {equipStatRows.length > 0 && (
          <View style={styles.equipStatsBox}>
            <Text style={[styles.equipStatsTitle, { color: theme.text }]}>装备属性加成</Text>
            <View style={styles.equipStatsGrid}>
              {equipStatRows.map((row) => (
                <Text key={row.label} style={[styles.equipStatLine, { color: theme.text }]} numberOfLines={2}>
                  {row.icon} {row.text}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {renderInnerTabs()}

      {innerTab === 'items' && (
        <View>
          <View style={styles.itemsToolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {ITEM_CATEGORIES.map((cat) => {
                const active = itemsCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[
                      styles.categoryChip,
                      {
                        borderColor: active ? theme.tint : theme.border,
                        backgroundColor: active ? theme.tint + '18' : theme.card,
                      },
                    ]}
                    onPress={() => setItemsCategory(cat.key)}
                  >
                    <Text style={{ color: active ? theme.tint : theme.text, fontSize: 12 }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.batchDecomposeBtn, batchDecomposeLoading && styles.batchDecomposeBtnDisabled]}
              onPress={handleBatchDecompose}
              disabled={batchDecomposeLoading}
            >
              {batchDecomposeLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.batchDecomposeText}>一键分解蓝绿</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.blockTitle, { color: theme.text }]}>背包物品</Text>
          {bagLoading ? (
            <ActivityIndicator color={theme.tint} />
          ) : bagItems.length === 0 ? (
            <Text style={[styles.emptyLine, { color: theme.icon }]}>背包暂无物品</Text>
          ) : (
            <View style={styles.bagGrid}>
              {bagItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.bagCard,
                    { backgroundColor: theme.card, borderColor: RARITY_COLORS[item?.template?.rarity || 1] },
                  ]}
                >
                  {item?.template?.icon ? (
                    <Image source={{ uri: item.template.icon }} style={styles.bagIcon} contentFit="contain" />
                  ) : null}
                  <Text style={[styles.bagName, { color: theme.text }]} numberOfLines={1}>
                    {item?.template?.name || '未知'}
                  </Text>
                  <Text style={[styles.bagCount, { color: theme.icon }]}>x{item?.quantity || 0}</Text>
                  <View style={styles.bagActions}>
                    {item?.template?.equipSlot ? (
                      isEquipped(item.id) ? (
                        <View style={[styles.miniBtn, styles.miniBtnDisabled]}>
                          <Text style={styles.miniBtnTextDisabled}>已穿戴</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: theme.tint }]}
                          onPress={() => handleEquip(item)}
                          disabled={equipLoadingId === item.id}
                        >
                          <Text style={styles.miniBtnText}>
                            {equipLoadingId === item.id ? '...' : '穿戴'}
                          </Text>
                        </TouchableOpacity>
                      )
                    ) : null}
                    {!isEquipped(item.id) && (
                      <TouchableOpacity
                        style={[styles.miniBtn, styles.miniBtnDanger]}
                        onPress={() => handleDecompose(item)}
                        disabled={decomposeId === item.id}
                      >
                        <Text style={styles.miniBtnText}>
                          {decomposeId === item.id ? '...' : '分解'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {innerTab === 'shop' && (
        <View>
          <View style={styles.shopTypeRow}>
            <TouchableOpacity
              style={[styles.shopTypeBtn, shopSubType === 'skin' && { backgroundColor: theme.tint }]}
              onPress={() => setShopSubType('skin')}
            >
              <Text style={{ color: shopSubType === 'skin' ? '#fff' : theme.text }}>宠物商店</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shopTypeBtn, shopSubType === 'props' && { backgroundColor: theme.tint }]}
              onPress={() => setShopSubType('props')}
            >
              <Text style={{ color: shopSubType === 'props' ? '#fff' : theme.text }}>道具商店</Text>
            </TouchableOpacity>
          </View>
          {shopSubType === 'props' ? (
            <View style={styles.comingSoon}>
              <Text style={{ fontSize: 36 }}>🛒</Text>
              <Text style={[styles.emptyLine, { color: theme.icon }]}>更多道具即将上架，敬请期待！</Text>
            </View>
          ) : skinLoading ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: 20 }} />
          ) : skins.length === 0 ? (
            <Text style={[styles.emptyLine, { color: theme.icon }]}>暂无可购买的宠物</Text>
          ) : (
            <View style={styles.skinGrid}>{skins.map((skin) => renderSkinCard(skin))}</View>
          )}
        </View>
      )}

      {innerTab === 'owned' && (
        <View>
          {skinLoading ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: 20 }} />
          ) : ownedSkins.length === 0 ? (
            <Text style={[styles.emptyLine, { color: theme.icon }]}>暂无已拥有的宠物</Text>
          ) : (
            <View style={styles.skinGrid}>{ownedSkins.map((skin) => renderSkinCard(skin, true))}</View>
          )}
        </View>
      )}

      {innerTab === 'skills' && (
        <View style={styles.comingSoon}>
          <Text style={{ fontSize: 36 }}>✨</Text>
          <Text style={[styles.emptyLine, { color: theme.icon }]}>技能系统即将开放，敬请期待</Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panelRoot: { flex: 1 },
  scrollContent: { paddingBottom: 24, flexGrow: 1 },
  loader: { marginTop: 40 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  displayCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  displayHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  petTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  powerScore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  powerIcon: { fontSize: 16 },
  powerText: { fontSize: 18, fontWeight: '800' },
  renameBlock: { flex: 1 },
  renameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  renameActions: { flexDirection: 'row', gap: 8 },
  renameBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  renameBtnCancel: { backgroundColor: 'rgba(0,0,0,0.06)' },
  renameBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  equipLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  equipColumn: { gap: 10, width: 64 },
  equipSlot: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipSlotFilled: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  slotIconWrap: { position: 'relative' },
  slotIcon: { width: 40, height: 40 },
  slotEmoji: { fontSize: 26 },
  slotLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
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
  enhanceBadgeHigh: { backgroundColor: '#fa8c16' },
  enhanceBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  previewCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 120 },
  levelText: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  avatarActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  avatarActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  avatarActionBtnPat: { backgroundColor: '#fa8c16' },
  avatarActionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statusSection: { gap: 10, marginBottom: 4 },
  statusItem: { gap: 4 },
  statusLabel: { fontSize: 13, fontWeight: '500' },
  statusTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: 4 },
  statusValue: { fontSize: 11, textAlign: 'right' },
  equipStatsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
  equipStatsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  equipStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipStatLine: { width: '48%', fontSize: 12, lineHeight: 18 },
  innerTabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  innerTabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  innerTabText: { fontSize: 13, fontWeight: '600' },
  itemsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryScroll: { flex: 1, maxHeight: 36 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  batchDecomposeBtn: {
    backgroundColor: '#ff4d4f',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchDecomposeBtnDisabled: { opacity: 0.7 },
  batchDecomposeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  blockTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  emptyLine: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 10,
  },
  itemIcon: { width: 36, height: 36 },
  equippedMeta: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemSlot: { fontSize: 12, marginTop: 2 },
  bagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bagCard: {
    width: '47%',
    borderRadius: 10,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
  },
  bagIcon: { width: 40, height: 40, marginBottom: 6 },
  bagName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  bagCount: { fontSize: 11, marginVertical: 4 },
  bagActions: { flexDirection: 'row', gap: 6 },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, minWidth: 52, alignItems: 'center' },
  miniBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.08)' },
  miniBtnDanger: { backgroundColor: '#ff7875' },
  miniBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  miniBtnTextDisabled: { color: '#999', fontSize: 11, fontWeight: '600' },
  shopTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  shopTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: {
    width: '47%',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    overflow: 'hidden',
  },
  skinCover: { alignItems: 'center', marginBottom: 8, position: 'relative' },
  currentBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#52c41a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  skinName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  skinDesc: { fontSize: 11, lineHeight: 15, minHeight: 30 },
  skinPrice: { fontSize: 12, fontWeight: '600', marginVertical: 6 },
  skinActions: { marginTop: 4 },
  skinBtn: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  skinBtnDisabled: { opacity: 0.5 },
  skinBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  comingSoon: { alignItems: 'center', paddingVertical: 40, gap: 8 },
});
