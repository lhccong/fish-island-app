import { userApi } from '@/api/user';
import MoYuTimeSettingsModal from '@/components/MoYuTimeSettingsModal';
import PetImage from '@/components/PetImage';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  computeTimeInfo,
  fetchHolidayInfo,
  formatHolidayCountdown,
  getGreeting,
  getTimeInfoEmoji,
  getTimeInfoLabel,
  getTodayStr,
  loadMoYuSettings,
  saveMoYuSettings,
  type HolidayInfo,
  type MoYuSettings,
  type TimeInfo,
} from '@/utils/moyuTime';
import { getPetDisplayHeight, isWebpSprite } from '@/utils/petRender';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const defaultQuotes = [
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '中国谚语' },
  { text: '不要等待机会，而要创造机会。', author: '林肯' },
  { text: '把时间用在思考上是最能节省时间的事情。', author: '卡曾斯' },
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { userInfo, refreshUserInfo } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  const [holidayInfo, setHolidayInfo] = useState<HolidayInfo | null>(null);
  const [holidayMsg, setHolidayMsg] = useState('正在获取节假日信息...');
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');
  const [petInfo, setPetInfo] = useState<any>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [moyuSettings, setMoyuSettings] = useState<MoYuSettings | null>(null);
  const [timeInfo, setTimeInfo] = useState<TimeInfo>({ type: 'work', timeRemaining: '--:--:--' });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (userInfo?.lastSignInDate) {
      setHasCheckedIn(isSameDay(new Date(userInfo.lastSignInDate), new Date()));
    }
  }, [userInfo?.lastSignInDate]);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(
        'https://international.v1.hitokoto.cn/?c=d&c=i&c=k&min_length=20&max_length=50',
      );
      const data = await res.json();
      if (data?.hitokoto) {
        setQuote({ text: data.hitokoto, author: data.from_who || data.from || '佚名' });
        return;
      }
    } catch {
      /* fallback */
    }
    const q = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
    setQuote(q);
  }, []);

  const fetchPet = useCallback(async () => {
    setPetLoading(true);
    try {
      const res = await userApi.getPetDetail();
      if (res?.code === 0) setPetInfo(res.data || null);
      else setPetInfo(null);
    } catch {
      setPetInfo(null);
    } finally {
      setPetLoading(false);
    }
  }, []);

  const refreshHoliday = useCallback(async () => {
    const info = await fetchHolidayInfo();
    if (info) {
      setHolidayInfo(info);
      setHolidayMsg(formatHolidayCountdown(info));
    } else {
      setHolidayMsg('暂无节假日信息');
    }
  }, []);

  const loadAll = useCallback(async () => {
    const settings = await loadMoYuSettings();
    setMoyuSettings(settings);
    await Promise.all([refreshHoliday(), fetchQuote(), fetchPet(), refreshUserInfo()]);
  }, [refreshHoliday, fetchQuote, fetchPet, refreshUserInfo]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!moyuSettings) return;
    const tick = () => {
      const info = computeTimeInfo(moyuSettings);
      setTimeInfo(info);
      if (holidayInfo) setHolidayMsg(formatHolidayCountdown(holidayInfo));
    };
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [moyuSettings, holidayInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleCheckIn = async () => {
    if (hasCheckedIn || checkingIn) return;
    setCheckingIn(true);
    setCheckInMsg('');
    try {
      const res = await userApi.signIn();
      if (res?.code === 0) {
        setHasCheckedIn(true);
        setCheckInMsg(userInfo?.vip ? '签到成功！获得 20 积分' : '签到成功！获得 10 积分');
        await refreshUserInfo();
      } else {
        setCheckInMsg(res?.message || res?.msg || '签到失败');
      }
    } catch {
      setCheckInMsg('签到失败，请稍后重试');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSaveSettings = async (s: MoYuSettings) => {
    await saveMoYuSettings(s);
    setMoyuSettings(s);
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
      >
        <View style={s.card}>
          <View style={s.welcomeHeader}>
            <Text style={s.welcomeTitle}>
              Hi，{userInfo?.userName || '摸鱼人'}，{getGreeting()}！
            </Text>
            <TouchableOpacity onPress={() => setSettingsVisible(true)} hitSlop={12}>
              <Text style={{ color: theme.tint, fontSize: 13 }}>⚙️ 时间</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.welcomeDate}>{getTodayStr()}</Text>
          <View style={s.offWorkBadge}>
            <Text style={s.offWorkEmoji}>{getTimeInfoEmoji(timeInfo)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.offWorkText}>{getTimeInfoLabel(timeInfo)}</Text>
              {timeInfo.earnedAmount != null && timeInfo.earnedAmount > 0 && (
                <Text style={s.earnedText}>今日已赚约 ¥{timeInfo.earnedAmount.toFixed(2)}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.card, s.halfCard]}>
            <Text style={s.cardLabel}>节假日倒计时</Text>
            <Text style={s.cardValue}>{holidayMsg || '加载中...'}</Text>
          </View>
          <View style={[s.card, s.halfCard]}>
            <Text style={s.cardLabel}>每日一言</Text>
            <Text style={s.cardValue} numberOfLines={3}>
              {quote.text || '加载中...'}
            </Text>
            {!!quote.author && <Text style={s.quoteAuthor}>—— {quote.author}</Text>}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>每日签到</Text>
          <TouchableOpacity
            style={[s.signInBtn, hasCheckedIn && s.signInBtnDone]}
            onPress={handleCheckIn}
            disabled={hasCheckedIn || checkingIn}
            activeOpacity={0.8}
          >
            {checkingIn ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.signInBtnText}>
                {hasCheckedIn ? '🎁 今日已签到' : '🎁 立即签到'}
              </Text>
            )}
          </TouchableOpacity>
          {!!checkInMsg && <Text style={s.checkInMsg}>{checkInMsg}</Text>}
        </View>

        <TouchableOpacity
          style={s.card}
          activeOpacity={0.85}
          onPress={() => router.push('/points')}
        >
          <View style={s.cardHeaderRow}>
            <Text style={s.cardLabel}>💎 积分玩法</Text>
            <Text style={[s.enterHint, { color: theme.tint }]}>进入 ›</Text>
          </View>
          <Text style={[s.pointsPlayDesc, { color: theme.icon }]}>
            摸鱼股市 · 武道大会 · 无尽爬塔 · 摸鱼农场
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.card}
          activeOpacity={0.85}
          onPress={() => router.push('/pet')}
        >
          <View style={s.cardHeaderRow}>
            <Text style={s.cardLabel}>我的宠物</Text>
            <Text style={[s.enterHint, { color: theme.tint }]}>进入乐园 ›</Text>
          </View>
          {petLoading ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: 12 }} />
          ) : petInfo ? (
            <PetCard pet={petInfo} theme={theme} s={s} />
          ) : (
            <Text style={s.emptyText}>暂未拥有宠物，点击进入宠物乐园</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {moyuSettings && (
        <MoYuTimeSettingsModal
          visible={settingsVisible}
          settings={moyuSettings}
          theme={theme}
          onClose={() => setSettingsVisible(false)}
          onSave={handleSaveSettings}
        />
      )}
    </SafeAreaView>
  );
}

function PetCard({ pet, theme, s }: any) {
  const petDisplaySize = 64;
  const petDisplayHeight = isWebpSprite(pet.petUrl)
    ? getPetDisplayHeight(petDisplaySize)
    : petDisplaySize;
  const stats = [
    { label: '等级', value: pet.level ?? '--' },
    { label: '经验', value: pet.exp ?? '--' },
    { label: '心情', value: pet.mood != null ? `${pet.mood}%` : '--' },
    { label: '饱腹', value: pet.hunger != null ? `${pet.hunger}%` : '--' },
  ];
  return (
    <View style={s.petRow}>
      {pet.petUrl ? (
        <View style={[s.petAvatarSlot, { width: petDisplaySize, height: petDisplayHeight }]}>
          <PetImage url={pet.petUrl} size={petDisplaySize} autoPlay />
        </View>
      ) : (
        <View
          style={[
            s.petAvatar,
            { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <Text style={{ fontSize: 28 }}>🐾</Text>
        </View>
      )}
      <View style={s.petInfo}>
        <Text style={[s.petName, { color: theme.text }]}>{pet.name || '未命名宠物'}</Text>
        <View style={s.petStats}>
          {stats.map((st) => (
            <View key={st.label} style={[s.petStat, { backgroundColor: theme.background }]}>
              <Text style={[s.petStatLabel, { color: theme.icon }]}>{st.label}</Text>
              <Text style={[s.petStatValue, { color: theme.text }]}>{String(st.value)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = (theme: typeof Colors['light']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    scroll: { padding: 16, gap: 12 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    row: { flexDirection: 'row', gap: 12 },
    halfCard: { flex: 1 },
    welcomeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    welcomeTitle: { fontSize: 17, fontWeight: '600', color: theme.text, flex: 1 },
    welcomeDate: { fontSize: 13, color: theme.icon, marginBottom: 10 },
    offWorkBadge: {
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    offWorkEmoji: { fontSize: 22 },
    offWorkText: { fontSize: 14, color: theme.tint, fontWeight: '500' },
    earnedText: { fontSize: 12, color: theme.icon, marginTop: 4 },
    cardLabel: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 },
    cardValue: { fontSize: 13, color: theme.text, lineHeight: 20 },
    quoteAuthor: { fontSize: 11, color: theme.icon, textAlign: 'right', marginTop: 4 },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    enterHint: { fontSize: 13, fontWeight: '600' },
    pointsPlayDesc: { fontSize: 13, marginTop: 4 },
    signInBtn: {
      backgroundColor: theme.tint,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInBtnDone: { opacity: 0.75 },
    signInBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    checkInMsg: { marginTop: 8, fontSize: 13, color: theme.tint, textAlign: 'center' },
    emptyText: { fontSize: 13, color: theme.icon, textAlign: 'center', paddingVertical: 12 },
    petRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    petAvatarSlot: {
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    petAvatar: { width: 64, height: 64, borderRadius: 14 },
    petInfo: { flex: 1 },
    petName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    petStats: { flexDirection: 'row', gap: 6 },
    petStat: { flex: 1, borderRadius: 8, padding: 6, alignItems: 'center' },
    petStatLabel: { fontSize: 10, marginBottom: 2 },
    petStatValue: { fontSize: 12, fontWeight: '600' },
  });
