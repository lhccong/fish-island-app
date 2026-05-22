import { userApi } from '@/api/user';
import PetBossPanel from '@/components/pet/PetBossPanel';
import PetGalleryPanel from '@/components/pet/PetGalleryPanel';
import PetLotteryPanel from '@/components/pet/PetLotteryPanel';
import MyPetPanel from '@/components/pet/MyPetPanel';
import OtherUserPetModal, { OtherPetTarget } from '@/components/pet/OtherUserPetModal';
import PetRankingPanel, { PetRankRow } from '@/components/pet/PetRankingPanel';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PET_CENTER_TABS, PetCenterTabKey } from '@/utils/petConstants';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PetCenterScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<PetCenterTabKey>('pet');
  const [petInfo, setPetInfo] = useState<any>(null);
  const [petLoading, setPetLoading] = useState(true);

  const [otherPetVisible, setOtherPetVisible] = useState(false);
  const [otherPetTarget, setOtherPetTarget] = useState<OtherPetTarget | null>(null);

  const loadPetDetail = useCallback(async () => {
    setPetLoading(true);
    try {
      const res = await userApi.getPetDetail();
      setPetInfo(res?.code === 0 ? res.data || null : null);
    } catch {
      setPetInfo(null);
    } finally {
      setPetLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPetDetail();
  }, [loadPetDetail]);

  const handleViewOtherPet = (row: PetRankRow) => {
    if (row.userId == null) return;
    setOtherPetTarget({
      userId: row.userId,
      userName: row.userName || '未知用户',
    });
    setOtherPetVisible(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'pet':
        return (
          <View style={styles.petPanelWrap}>
            <MyPetPanel
              petInfo={petInfo}
              loading={petLoading}
              onRefresh={loadPetDetail}
              onPetUpdated={setPetInfo}
            />
          </View>
        );
      case 'ranking':
        return <PetRankingPanel onViewOtherPet={handleViewOtherPet} />;
      case 'gallery':
        return <PetGalleryPanel />;
      case 'boss':
        return <PetBossPanel />;
      case 'lottery':
        return <PetLotteryPanel />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {PET_CENTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: theme.tint + '22' }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? theme.tint : theme.icon },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>{renderContent()}</View>

      <OtherUserPetModal
        visible={otherPetVisible}
        target={otherPetTarget}
        onClose={() => {
          setOtherPetVisible(false);
          setOtherPetTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 56,
  },
  tabBarContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 12 },
  petPanelWrap: { flex: 1 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  placeholderText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  placeholderSub: { fontSize: 12, textAlign: 'center' },
});
