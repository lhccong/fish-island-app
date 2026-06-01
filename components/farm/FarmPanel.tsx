import {
  CropDTO,
  farmApi,
  FarmFriendListVO,
  FarmStealRecordVO,
  FarmUserVO,
  LandDTO,
} from '@/api/farm';
import FarmActionDock, { FarmDockActionKey } from '@/components/farm/FarmActionDock';
import FarmFriendsModal from '@/components/farm/FarmFriendsModal';
import FarmPlot from '@/components/farm/FarmPlot';
import FarmSkyBackground from '@/components/farm/FarmSkyBackground';
import PlantCropModal from '@/components/farm/PlantCropModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FARM_FIELD_BOARD,
  FARM_FRIENDS_FAB,
  FARM_HEADER_BG,
  FARM_STAT_CHIP,
} from '@/constants/farmTheme';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { calcGridSize, calcTileSize, FARM_GRID_GAP } from '@/utils/farmLayout';
import {
  buildLandGrid,
  FARM_HARVEST_ICON,
  formatCountdown,
  GRID_COLS,
  GRID_ROWS,
  canStealOnFriendLand,
  getFriendUserId,
  isFriendLandPlot,
  isLandEmpty,
  isLandMature,
  isLandUnlocked,
  LAND_STATUS,
  mergeLandUpdates,
  parseFriendLandsPayload,
  resolveStealLandId,
  resolveFriendUserId,
  sumStealCoinGained,
  isFarmStealRecordUnread,
  toLandIndex,
  TOTAL_LANDS,
} from '@/utils/farmUtils';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BOARD_OUTER_PAD = 10;
const BOARD_INNER_PAD = 8;

export default function FarmPanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const { userInfo, refreshUserInfo } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [lands, setLands] = useState<LandDTO[]>([]);
  const [crops, setCrops] = useState<CropDTO[]>([]);
  const [farmUser, setFarmUser] = useState<FarmUserVO | null>(null);
  const [now, setNow] = useState(Date.now());
  const [stolenRecords, setStolenRecords] = useState<FarmStealRecordVO[]>([]);
  const [stolenLoading, setStolenLoading] = useState(false);
  const [markAllStolenReadLoading, setMarkAllStolenReadLoading] = useState(false);
  const initialGridW = Math.max(
    0,
    width - 24 - (BOARD_OUTER_PAD + BOARD_INNER_PAD) * 2,
  );
  const [gridInnerWidth, setGridInnerWidth] = useState(initialGridW);

  const [plantModalVisible, setPlantModalVisible] = useState(false);
  const [selectedLandIds, setSelectedLandIds] = useState<number[]>([]);
  const [plantAnchorLandId, setPlantAnchorLandId] = useState<number | null>(null);

  const [friendsVisible, setFriendsVisible] = useState(false);
  const [friendsTab, setFriendsTab] = useState<'play' | 'visitor'>('play');

  const [visitTarget, setVisitTarget] = useState<FarmFriendListVO | null>(null);
  const [visitingFriendUserId, setVisitingFriendUserId] = useState<string | null>(null);
  const [visitLoadingId, setVisitLoadingId] = useState<string | null>(null);
  const [friendFarm, setFriendFarm] = useState<{ name: string; avatar?: string } | null>(null);
  const [friendLands, setFriendLands] = useState<LandDTO[]>([]);
  const [friendFarmLoading, setFriendFarmLoading] = useState(false);

  const availablePoints = (userInfo?.points ?? 0) - (userInfo?.usedPoints ?? 0);
  const isNarrow = width < 400;

  const tileSize = useMemo(
    () => calcTileSize(gridInnerWidth, isNarrow ? 58 : 68),
    [gridInnerWidth, isNarrow],
  );
  const gridSize = useMemo(() => calcGridSize(tileSize), [tileSize]);

  const isVisitingFriend = visitTarget != null;
  const activeLands = isVisitingFriend ? friendLands : lands;

  const landGrid = useMemo(() => buildLandGrid(activeLands), [activeLands]);
  const unlockedCount = useMemo(() => landGrid.filter(isLandUnlocked).length, [landGrid]);

  const cropMap = useMemo(() => {
    const map = new Map<number, CropDTO>();
    crops.forEach((c) => {
      if (c.id != null) map.set(c.id, c);
    });
    return map;
  }, [crops]);

  const matureLands = useMemo(
    () => lands.filter((l) => isLandMature(l, now) && l.id != null && isLandUnlocked(l)),
    [lands, now],
  );

  const stealableLands = useMemo(
    () =>
      isVisitingFriend ? friendLands.filter((l) => canStealOnFriendLand(l, now)) : [],
    [friendLands, now, isVisitingFriend],
  );

  const unreadStolenCount = useMemo(
    () => stolenRecords.filter(isFarmStealRecordUnread).length,
    [stolenRecords],
  );

  const nearestGrowingMs = useMemo(() => {
    let min = Infinity;
    for (const land of lands) {
      if (land.status === LAND_STATUS.GROWING && land.harvestTime) {
        const remain = new Date(land.harvestTime).getTime() - now;
        if (remain > 0) min = Math.min(min, remain);
      }
    }
    return min === Infinity ? null : min;
  }, [lands, now]);

  const cropMatureLabel = useMemo(() => {
    if (matureLands.length > 0) return '可收获';
    if (nearestGrowingMs != null) return formatCountdown(nearestGrowingMs);
    return '—';
  }, [matureLands.length, nearestGrowingMs]);

  const emptyLands = useMemo(
    () => lands.filter((l) => l.id != null && isLandEmpty(l)),
    [lands],
  );

  const plantAllSelected =
    emptyLands.length > 0 &&
    selectedLandIds.length === emptyLands.length &&
    emptyLands.every((l) => l.id != null && selectedLandIds.includes(l.id));

  const plantModalTitle = useMemo(() => {
    const count = selectedLandIds.length;
    if (count === 0) return '选择种子';
    if (count === 1) {
      const land = lands.find((l) => l.id === selectedLandIds[0]);
      return `选择种子 · 地块 ${land?.landIndex ?? 1}`;
    }
    return `选择种子 · ${count} 块空地`;
  }, [selectedLandIds, lands]);

  const gridRows = useMemo(() => {
    const rows: (LandDTO | null)[][] = [];
    for (let r = 0; r < GRID_ROWS; r += 1) {
      rows.push(landGrid.slice(r * GRID_COLS, (r + 1) * GRID_COLS));
    }
    return rows;
  }, [landGrid]);

  const getCrop = useCallback(
    (land: LandDTO | null) => {
      if (!land?.plantedCropId) return undefined;
      return cropMap.get(land.plantedCropId);
    },
    [cropMap],
  );

  const loadStolenRecords = useCallback(async () => {
    setStolenLoading(true);
    try {
      const res = await farmApi.getMyStolenRecords();
      if (res.code === 0 && res.data) setStolenRecords(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStolenLoading(false);
    }
  }, []);

  const handleMarkAllStolenRead = useCallback(async () => {
    if (unreadStolenCount === 0) {
      toast.info('没有未读记录');
      return;
    }
    setMarkAllStolenReadLoading(true);
    try {
      const res = await farmApi.markAllStolenRecordsAsRead();
      if (res.code === 0) {
        toast.success('已全部标记为已读');
        await loadStolenRecords();
      } else {
        toast.error(res.msg || res.message || '标记已读失败');
      }
    } catch {
      toast.error('标记已读失败');
    } finally {
      setMarkAllStolenReadLoading(false);
    }
  }, [unreadStolenCount, loadStolenRecords]);

  const refreshLandsAndFarmUser = useCallback(async () => {
    try {
      const [landsRes, farmRes] = await Promise.all([
        farmApi.getMyLands(),
        farmApi.getMyFarmUser(),
      ]);
      if (landsRes.code === 0 && landsRes.data) {
        setLands(landsRes.data);
      } else {
        return false;
      }
      if (farmRes.code === 0 && farmRes.data) setFarmUser(farmRes.data);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  const loadFarmData = useCallback(async () => {
    setLoading(true);
    try {
      const [landsRes, cropsRes, farmRes] = await Promise.all([
        farmApi.getMyLands(),
        farmApi.getAllCrops(),
        farmApi.getMyFarmUser(),
      ]);
      if (landsRes.code === 0 && landsRes.data) {
        setLands(landsRes.data);
      } else {
        toast.error(landsRes.msg || landsRes.message || '加载地块失败');
      }
      if (cropsRes.code === 0 && cropsRes.data) setCrops(cropsRes.data);
      if (farmRes.code === 0 && farmRes.data) setFarmUser(farmRes.data);
      await loadStolenRecords();
    } catch {
      toast.error('加载农场数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadStolenRecords]);

  useEffect(() => {
    setGridInnerWidth(initialGridW);
  }, [initialGridW]);

  useEffect(() => {
    loadFarmData();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [loadFarmData]);

  const openPlantModal = (landIds: number[], anchorLandId?: number | null) => {
    setSelectedLandIds(landIds);
    setPlantAnchorLandId(anchorLandId ?? (landIds.length === 1 ? landIds[0] : null));
    setPlantModalVisible(true);
  };

  const closePlantModal = () => {
    setPlantModalVisible(false);
    setSelectedLandIds([]);
    setPlantAnchorLandId(null);
  };

  const handleHarvest = async (landIds: number[]) => {
    if (landIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await farmApi.harvest(landIds);
      if (res.code === 0) {
        toast.success(
          landIds.length > 1 ? `成功收获 ${landIds.length} 块地！` : '收获成功，积分已入账～',
        );
        const refreshed = await refreshLandsAndFarmUser();
        if (!refreshed && res.data?.length) {
          setLands((prev) => mergeLandUpdates(prev, res.data!));
        }
        await refreshUserInfo();
      } else {
        toast.error(res.msg || res.message || '收获失败');
      }
    } catch {
      toast.error('收获失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlant = async (cropId: number) => {
    if (selectedLandIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await farmApi.plant(
        selectedLandIds.map((landId) => ({ landId, cropId })),
      );
      if (res.code === 0) {
        toast.success(
          selectedLandIds.length > 1
            ? `已在 ${selectedLandIds.length} 块地播种～`
            : '播种成功，耐心等待成熟吧～',
        );
        closePlantModal();
        const refreshed = await refreshLandsAndFarmUser();
        if (!refreshed && res.data?.length) {
          setLands((prev) => mergeLandUpdates(prev, res.data!));
        } else if (!refreshed) {
          await loadFarmData();
        }
        await refreshUserInfo();
      } else {
        toast.error(res.msg || res.message || '种植失败');
      }
    } catch {
      toast.error('种植失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlotPress = (land: LandDTO | null, arrayIndex: number) => {
    const landIndex = toLandIndex(arrayIndex);
    if (!isLandUnlocked(land)) {
      if (landIndex > 1 && !isLandUnlocked(landGrid[arrayIndex - 1])) {
        toast.info('土地按顺序解锁，请先解锁前一块地');
      } else {
        toast.info(`第 ${landIndex} 块地尚未解锁，升级农场后可开垦`);
      }
      return;
    }
    if (isLandMature(land, now) && land?.id != null) {
      handleHarvest([land.id]);
      return;
    }
    if (land?.status === LAND_STATUS.GROWING && land) {
      const crop = getCrop(land);
      const remain = land.harvestTime
        ? new Date(land.harvestTime).getTime() - now
        : 0;
      toast.info(
        `${land.cropName || crop?.name || '作物'}生长中，剩余 ${formatCountdown(remain)}`,
      );
      return;
    }
    if (land?.id != null) openPlantModal([land.id], land.id);
  };

  const openFriendsModal = (tab: 'play' | 'visitor') => {
    setFriendsTab(tab);
    setFriendsVisible(true);
    if (tab === 'visitor') loadStolenRecords();
  };

  const enterFriendFarm = useCallback(
    (friend: FarmFriendListVO, friendLandsData: LandDTO[]) => {
      const friendUserId = getFriendUserId(friend);
      setVisitingFriendUserId(friendUserId ?? null);
      setFriendLands(friendLandsData);
      setFriendFarm({
        name: friend.nickname ?? '好友',
        avatar: friend.avatar,
      });
      setVisitTarget(friend);
    },
    [],
  );

  const loadFriendLands = useCallback(async (friendUserId: string) => {
    const data = await farmApi.loadFriendLands(friendUserId);
    setFriendLands(data);
  }, []);

  const visitFarmByUserId = useCallback(
    async (friend: FarmFriendListVO) => {
      const friendUserId = getFriendUserId(friend);
      if (friendUserId == null) return false;
      setVisitLoadingId(friendUserId);
      setFriendFarmLoading(true);
      try {
        const data = await farmApi.loadFriendLands(friendUserId);
        enterFriendFarm(friend, data);
        toast.success(`正在拜访 ${friend.nickname || '好友'} 的农场`);
        return true;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : '访问好友农场失败';
        toast.error(errMsg);
        return false;
      } finally {
        setVisitLoadingId(null);
        setFriendFarmLoading(false);
      }
    },
    [enterFriendFarm],
  );

  const refreshFriendFarm = useCallback(
    async (friend: FarmFriendListVO) => {
      const friendUserId = getFriendUserId(friend);
      if (friendUserId == null) return;
      setFriendFarmLoading(true);
      try {
        await loadFriendLands(friendUserId);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : '刷新好友农场失败';
        toast.error(errMsg);
      } finally {
        setFriendFarmLoading(false);
      }
    },
    [loadFriendLands],
  );

  const exitFriendFarm = useCallback(() => {
    setVisitTarget(null);
    setVisitingFriendUserId(null);
    setFriendFarm(null);
    setFriendLands([]);
  }, []);

  const handleSteal = async (land: LandDTO) => {
    if (!visitTarget) return;
    const landId = resolveStealLandId(land);
    if (landId == null) {
      toast.info('该地块暂不可偷');
      return;
    }

    setActionLoading(true);
    try {
      const res = await farmApi.steal({ landId });
      if (res.code === 0) {
        const coin = sumStealCoinGained(res.data);
        toast.success(coin > 0 ? `偷菜成功，获得 ${coin} 积分～` : '偷菜成功～');
        if (visitingFriendUserId) {
          await loadFriendLands(visitingFriendUserId);
        }
        await loadStolenRecords();
        await refreshUserInfo();
      } else {
        toast.error(res.msg || res.message || '偷菜失败');
      }
    } catch {
      toast.error('偷菜失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStealAll = async () => {
    if (!visitTarget || stealableLands.length === 0) {
      toast.info('暂无可偷的成熟作物');
      return;
    }
    const landIds = stealableLands
      .map((land) => resolveStealLandId(land))
      .filter((id): id is number => id != null);
    if (landIds.length === 0) {
      toast.info('暂无可偷的成熟作物');
      return;
    }

    setActionLoading(true);
    try {
      const res = await farmApi.steal({ landIds });
      if (res.code === 0 && (res.data?.length ?? 0) > 0) {
        const count = res.data!.length;
        const coin = sumStealCoinGained(res.data);
        toast.success(
          coin > 0
            ? `成功偷取 ${count} 块地，获得 ${coin} 积分～`
            : `成功偷取 ${count} 块地的作物～`,
        );
        if (visitingFriendUserId) {
          await loadFriendLands(visitingFriendUserId);
        }
        await loadStolenRecords();
        await refreshUserInfo();
      } else {
        toast.error(res.msg || res.message || '偷菜失败');
      }
    } catch {
      toast.error('偷菜失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFriendPlotPress = (land: LandDTO | null) => {
    if (!isFriendLandPlot(land)) return;
    if (isLandMature(land!, now)) {
      if (resolveStealLandId(land!) == null) {
        toast.info('地块信息异常，请刷新好友农场后重试');
        return;
      }
      handleSteal(land!);
      return;
    }
    if (land!.status === LAND_STATUS.GROWING) {
      const remain = land!.harvestTime
        ? new Date(land!.harvestTime).getTime() - now
        : 0;
      toast.info(
        `${land!.cropName || getCrop(land!)?.name || '作物'}还在生长，${formatCountdown(remain)} 后成熟`,
      );
      return;
    }
    toast.info('好友的地块是空的');
  };

  const onPlotPress = (land: LandDTO | null, arrayIndex: number) => {
    if (isVisitingFriend) {
      handleFriendPlotPress(land);
    } else {
      handlePlotPress(land, arrayIndex);
    }
  };

  const handleDockMature = () => {
    if (isVisitingFriend) {
      if (stealableLands.length > 0) {
        handleStealAll();
        return;
      }
      toast.info('暂无可偷的成熟作物');
      return;
    }
    if (matureLands.length > 0) {
      handleHarvest(matureLands.map((l) => l.id!).filter(Boolean));
      return;
    }
    if (nearestGrowingMs != null) {
      toast.info(`最近成熟：${formatCountdown(nearestGrowingMs)}`);
    }
  };

  const handleDockAction = (key: FarmDockActionKey) => {
    const tips: Record<FarmDockActionKey, string> = {
      shop: '商店功能开发中，敬请期待',
      task: '任务功能开发中，敬请期待',
      bag: '背包功能开发中，敬请期待',
      reward: '领取奖励功能开发中，敬请期待',
      cottage: '农舍功能开发中，敬请期待',
    };
    toast.info(tips[key]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
    <FarmSkyBackground style={styles.skyRoot}>
      <View style={styles.header}>
        <View style={styles.headerLayout}>
          <View style={styles.headerMain}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => (isVisitingFriend ? exitFriendFarm() : router.back())}
                accessibilityLabel={isVisitingFriend ? '返回我的农场' : '返回'}
              >
                <IconSymbol name="chevron.left" size={22} color="#3d6b22" />
              </TouchableOpacity>

              <IconSymbol name="leaf.fill" size={28} color="#52a934" />
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {isVisitingFriend ? `${friendFarm?.name ?? '好友'}的农场` : '摸鱼农场'}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {isVisitingFriend ? '点击成熟且可偷的地块偷菜' : '种下希望，收获积分'}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.statsScroll}
              contentContainerStyle={styles.statsRow}
            >
              <View style={styles.statChip}>
                <IconSymbol name="star.fill" size={12} color={FARM_STAT_CHIP.text} />
                <Text style={styles.statChipText}>Lv.{farmUser?.level ?? 1}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>
                  田地 {unlockedCount}/{TOTAL_LANDS}
                </Text>
              </View>
              <View style={[styles.statChip, styles.statChipPoints]}>
                <IconSymbol name="gift.fill" size={12} color={FARM_STAT_CHIP.pointsText} />
                <Text style={[styles.statChipText, styles.statChipPointsText]} numberOfLines={1}>
                  积分 {availablePoints}
                </Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>收获 {farmUser?.totalHarvest ?? 0}</Text>
              </View>
            </ScrollView>
          </View>

          <View style={styles.headerAside}>
            {!isVisitingFriend && matureLands.length > 0 ? (
              <TouchableOpacity
                style={styles.harvestAllBtn}
                disabled={actionLoading}
                onPress={() => handleHarvest(matureLands.map((l) => l.id!).filter(Boolean))}
              >
                <Text style={styles.harvestAllBtnText}>摘取</Text>
              </TouchableOpacity>
            ) : null}
            {isVisitingFriend && stealableLands.length > 0 ? (
              <TouchableOpacity
                style={styles.stealAllBtn}
                disabled={actionLoading}
                onPress={handleStealAll}
              >
                <Text style={styles.stealAllBtnText}>偷菜</Text>
              </TouchableOpacity>
            ) : null}
            {!isVisitingFriend && emptyLands.length > 0 ? (
              <TouchableOpacity
                style={styles.plantAllBtn}
                disabled={actionLoading}
                onPress={() => openPlantModal(emptyLands.map((l) => l.id!).filter(Boolean))}
              >
                <IconSymbol name="plus" size={14} color="#fff" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.refreshBtn}
              disabled={isVisitingFriend ? friendFarmLoading : loading}
              onPress={
                isVisitingFriend
                  ? () => visitTarget && refreshFriendFarm(visitTarget)
                  : loadFarmData
              }
            >
              <IconSymbol name="arrow.clockwise.circle" size={18} color="#389e0d" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scene}
        contentContainerStyle={[
          styles.sceneInner,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              if (isVisitingFriend && visitTarget) {
                refreshFriendFarm(visitTarget).finally(() => setRefreshing(false));
              } else {
                loadFarmData();
              }
            }}
            tintColor="#52c41a"
          />
        }
      >
        {loading || friendFarmLoading ? (
          <ActivityIndicator style={styles.loader} color="#52c41a" size="large" />
        ) : (
          <View style={[styles.sceneBody, { maxWidth: width - 20 }]}>
            {!isVisitingFriend ? (
              <View style={styles.sceneDecos} pointerEvents="box-none">
                <View style={styles.decoSign}>
                  <Text style={styles.decoSignText}>劳动光荣</Text>
                </View>
                <TouchableOpacity
                  style={styles.decoMail}
                  onPress={() => openFriendsModal('visitor')}
                  accessibilityLabel={`谁偷了我的菜，${unreadStolenCount} 条未读`}
                >
                  {unreadStolenCount > 0 ? (
                    <View style={styles.mailBadge}>
                      <Text style={styles.mailBadgeText}>
                        {unreadStolenCount > 99 ? '99+' : unreadStolenCount}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.decoMailIcon}>
                    <IconSymbol name="envelope.fill" size={20} color="#c62828" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.decoFriends}
                  onPress={() => openFriendsModal('play')}
                  accessibilityLabel="好友"
                >
                  <View style={styles.decoFriendsIcon}>
                    <IconSymbol name="person.3.fill" size={22} color={FARM_FRIENDS_FAB.icon} />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.fieldArea}>
            <View style={styles.fieldBoard}>
              <View style={styles.fieldInner}>
                <View
                  style={styles.gridMeasure}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0 && Math.abs(w - gridInnerWidth) > 1) {
                      setGridInnerWidth(w);
                    }
                  }}
                >
                  <View style={[styles.plotsGrid, { width: gridSize.width, gap: FARM_GRID_GAP }]}>
                    {gridRows.map((row, rowIndex) => (
                      <View
                        key={`row-${rowIndex}`}
                        style={[styles.plotRow, { gap: FARM_GRID_GAP }]}
                      >
                        {row.map((land, colIndex) => {
                          const arrayIndex = rowIndex * GRID_COLS + colIndex;
                          return (
                            <FarmPlot
                              key={land?.id ?? `slot-${toLandIndex(arrayIndex)}`}
                              land={land}
                              arrayIndex={arrayIndex}
                              unlockedCount={unlockedCount}
                              now={now}
                              crop={getCrop(land)}
                              tileSize={tileSize}
                              disabled={actionLoading}
                              friendMode={isVisitingFriend}
                              onPress={() => onPlotPress(land, arrayIndex)}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            </View>

            {!isVisitingFriend ? (
              <FarmActionDock
                matureCount={matureLands.length}
                matureLabel={cropMatureLabel}
                disabled={actionLoading}
                onMature={handleDockMature}
                onAction={handleDockAction}
              />
            ) : null}

            {!isVisitingFriend && matureLands.length > 0 && (
              <TouchableOpacity
                style={styles.quickHarvest}
                disabled={actionLoading}
                onPress={() => handleHarvest(matureLands.map((l) => l.id!).filter(Boolean))}
              >
                <Image
                  source={{ uri: FARM_HARVEST_ICON }}
                  style={styles.quickHarvestIcon}
                  contentFit="contain"
                />
                <Text style={styles.quickHarvestLabel}>一键摘取</Text>
              </TouchableOpacity>
            )}
            {isVisitingFriend && stealableLands.length > 0 && (
              <TouchableOpacity
                style={styles.quickHarvest}
                disabled={actionLoading}
                onPress={handleStealAll}
              >
                <Image
                  source={{ uri: FARM_HARVEST_ICON }}
                  style={styles.quickHarvestIcon}
                  contentFit="contain"
                />
                <Text style={[styles.quickHarvestLabel, styles.quickStealLabel]}>一键偷菜</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <PlantCropModal
        visible={plantModalVisible}
        title={plantModalTitle}
        crops={crops}
        emptyLandCount={emptyLands.length}
        selectedLandCount={selectedLandIds.length}
        planting={actionLoading}
        onClose={closePlantModal}
        onPlant={handlePlant}
        showBatchToggle={emptyLands.length > 1}
        plantAllSelected={plantAllSelected}
        onTogglePlantAll={(plantAll) => {
          if (plantAll) {
            setSelectedLandIds(emptyLands.map((l) => l.id!).filter(Boolean));
          } else {
            const fallback =
              plantAnchorLandId ?? emptyLands[0]?.id ?? selectedLandIds[0];
            if (fallback != null) setSelectedLandIds([fallback]);
          }
        }}
      />

      <FarmFriendsModal
        visible={friendsVisible}
        initialTab={friendsTab}
        stolenRecords={stolenRecords}
        stolenLoading={stolenLoading}
        myLevel={farmUser?.level ?? 1}
        myNickname={farmUser?.userName ?? userInfo?.userNickname ?? userInfo?.userName ?? '我'}
        myAvatar={farmUser?.userAvatar ?? userInfo?.userAvatar}
        onClose={() => setFriendsVisible(false)}
        onRefreshStolen={loadStolenRecords}
        markAllStolenReadLoading={markAllStolenReadLoading}
        onMarkAllStolenRead={handleMarkAllStolenRead}
        visitLoadingId={visitLoadingId}
        onVisitFriend={async (friend) => {
          const ok = await visitFarmByUserId(friend);
          if (ok) setFriendsVisible(false);
        }}
      />
    </FarmSkyBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skyRoot: {
    flex: 1,
  },
  header: {
    backgroundColor: FARM_HEADER_BG,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  headerLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
  },
  headerAside: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    minWidth: 44,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3d6b22',
  },
  headerSub: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 1,
  },
  statsScroll: {
    width: '100%',
  },
  plantAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#52c41a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestAllBtn: {
    minWidth: 52,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#52c41a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  stealAllBtn: {
    minWidth: 52,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fa8c16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stealAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: FARM_STAT_CHIP.bg,
    borderWidth: 1,
    borderColor: FARM_STAT_CHIP.border,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: FARM_STAT_CHIP.text,
  },
  statChipPoints: {
    backgroundColor: FARM_STAT_CHIP.pointsBg,
    borderColor: FARM_STAT_CHIP.pointsBorder,
  },
  statChipPointsText: {
    color: FARM_STAT_CHIP.pointsText,
  },
  scene: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sceneInner: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  sceneBody: {
    width: '100%',
    flexGrow: 1,
    alignItems: 'center',
    minHeight: 320,
  },
  sceneDecos: {
    position: 'absolute',
    top: 0,
    left: 2,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldArea: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 4,
  },
  loader: {
    marginTop: 40,
  },
  fieldBoard: {
    width: '100%',
    alignSelf: 'center',
    padding: BOARD_OUTER_PAD,
    borderRadius: 18,
    backgroundColor: FARM_FIELD_BOARD.outer[1],
    shadowColor: '#325a14',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  decoSign: {
    backgroundColor: '#ff7a45',
    borderWidth: 2,
    borderColor: '#d4380d',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: '-3deg' }],
  },
  decoSignText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  decoMail: {
    position: 'relative',
  },
  decoFriends: {
    position: 'relative',
  },
  decoFriendsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: FARM_FRIENDS_FAB.border,
    backgroundColor: FARM_FRIENDS_FAB.gradient[1],
    shadowColor: '#3c2814',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  decoMailIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff8e8',
    borderWidth: 2,
    borderColor: '#d4a84a',
  },
  mailBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f5222d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  mailBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  fieldInner: {
    padding: BOARD_INNER_PAD,
    borderRadius: 10,
    backgroundColor: FARM_FIELD_BOARD.inner[1],
  },
  gridMeasure: {
    width: '100%',
    alignItems: 'center',
  },
  plotsGrid: {
    flexDirection: 'column',
  },
  plotRow: {
    flexDirection: 'row',
  },
  quickHarvest: {
    alignItems: 'center',
    gap: 2,
  },
  quickHarvestIcon: {
    width: 64,
    height: 64,
  },
  quickHarvestLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: '#6b4423',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickStealLabel: {
    color: '#fff7e6',
    textShadowColor: '#ad4e00',
  },
});
