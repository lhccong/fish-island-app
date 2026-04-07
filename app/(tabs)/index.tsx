import { userApi } from '@/api/user';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── helpers ────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 17) return '下午好';
  if (h < 19) return '傍晚好';
  return '晚上好';
};

const getTodayStr = () => {
  const d = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`;
};

const getOffWorkText = () => {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return '今天休息，好好放松一下吧~';
  const end = new Date(now);
  end.setHours(17, 0, 0, 0);
  if (now > end) return '今天辛苦了，好好休息吧！';
  const diff = end.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `再坚持 ${hours.toFixed(1)} 小时就可以下班啦，加油！`;
  return `再坚持 ${minutes} 分钟就可以下班啦，坚持就是胜利！`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const defaultHolidays = [
  { name: '元旦', date: '2026-01-01' },
  { name: '春节', date: '2026-02-17' },
  { name: '清明节', date: '2026-04-04' },
  { name: '劳动节', date: '2026-05-01' },
  { name: '端午节', date: '2026-06-23' },
  { name: '中秋节', date: '2026-09-20' },
  { name: '国庆节', date: '2026-10-01' },
];

const getNextHolidayFromDefaults = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let best: { name: string; days: number } | null = null;
  for (const h of defaultHolidays) {
    const d = new Date(h.date);
    d.setHours(0, 0, 0, 0);
    const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 0 && (!best || days < best.days)) best = { name: h.name, days };
  }
  if (!best) return '暂无节假日信息';
  if (best.days === 0) return `今天是${best.name}，节日快乐！`;
  return `距离${best.name}还有 ${best.days} 天`;
};

const defaultQuotes = [
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '中国谚语' },
  { text: '不要等待机会，而要创造机会。', author: '林肯' },
  { text: '把时间用在思考上是最能节省时间的事情。', author: '卡曾斯' },
];

// ─── component ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo, refreshUserInfo } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  const [holidayMsg, setHolidayMsg] = useState('正在获取节假日信息...');
  const [quote, setQuote] = useState({ text: '', author: '' });
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');
  const [petInfo, setPetInfo] = useState<any>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petActionLoading, setPetActionLoading] = useState<'pat' | 'feed' | null>(null);
  const [petMsg, setPetMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // derive check-in status from userInfo.lastSignInDate
  useEffect(() => {
    if (userInfo?.lastSignInDate) {
      setHasCheckedIn(isSameDay(new Date(userInfo.lastSignInDate), new Date()));
    }
  }, [userInfo?.lastSignInDate]);

  const fetchHoliday = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`https://timor.tech/api/holiday/info/${todayStr}`);
      const data = await res.json();
      if (data.code === 0 && data.holiday?.holiday) {
        setHolidayMsg(`今天是${data.holiday.name}，节日快乐！`);
        return;
      }
      const nextRes = await fetch('https://timor.tech/api/holiday/next');
      const nextData = await nextRes.json();
      if (nextData.holiday) {
        const d = new Date(nextData.holiday.date);
        d.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setHolidayMsg(days === 0 ? `今天是${nextData.holiday.name}，节日快乐！` : `距离${nextData.holiday.name}还有 ${days} 天`);
      } else {
        setHolidayMsg(getNextHolidayFromDefaults());
      }
    } catch {
      setHolidayMsg(getNextHolidayFromDefaults());
    }
  }, []);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch('https://international.v1.hitokoto.cn/?c=d&c=i&c=k&min_length=20&max_length=50');
      const data = await res.json();
      if (data?.hitokoto) {
        setQuote({ text: data.hitokoto, author: data.from_who || data.from || '佚名' });
        return;
      }
    } catch {}
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

  const loadAll = useCallback(async () => {
    await Promise.all([fetchHoliday(), fetchQuote(), fetchPet(), refreshUserInfo()]);
  }, [fetchHoliday, fetchQuote, fetchPet, refreshUserInfo]);

  useEffect(() => {
    loadAll();
    timerRef.current = setInterval(() => {}, 60000); // tick for offwork text
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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

  const handlePetAction = async (action: 'pat' | 'feed') => {
    const petId = petInfo?.petId ?? petInfo?.id ?? petInfo?.petID;
    if (!petId || petActionLoading) return;
    setPetActionLoading(action);
    setPetMsg('');
    try {
      const res = action === 'pat' ? await userApi.patPet(petId) : await userApi.feedPet(petId);
      if (res?.code === 0) {
        setPetMsg(action === 'pat' ? '抚摸成功，宠物更开心啦~' : '喂食成功，宠物吃饱啦~');
        // update pet stats from response
        const payload = res.data;
        if (payload && typeof payload === 'object') {
          setPetInfo((prev: any) => ({ ...prev, ...payload }));
        }
      } else {
        setPetMsg(res?.message || res?.msg || '操作失败');
      }
    } catch (e: any) {
      setPetMsg(e?.message || '操作失败');
    } finally {
      setPetActionLoading(null);
    }
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
      >
        {/* Welcome card */}
        <View style={s.card}>
          <Text style={s.welcomeTitle}>
            Hi，{userInfo?.userName || '摸鱼人'}，{getGreeting()}！
          </Text>
          <Text style={s.welcomeDate}>{getTodayStr()}</Text>
          <View style={s.offWorkBadge}>
            <Text style={s.offWorkText}>{getOffWorkText()}</Text>
          </View>
        </View>

        {/* Holiday + Quote row */}
        <View style={s.row}>
          <View style={[s.card, s.halfCard]}>
            <Text style={s.cardLabel}>节假日倒计时</Text>
            <Text style={s.cardValue}>{holidayMsg || '加载中...'}</Text>
          </View>
          <View style={[s.card, s.halfCard]}>
            <Text style={s.cardLabel}>每日一言</Text>
            <Text style={s.cardValue} numberOfLines={3}>{quote.text || '加载中...'}</Text>
            {!!quote.author && <Text style={s.quoteAuthor}>—— {quote.author}</Text>}
          </View>
        </View>

        {/* Sign-in card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>每日签到</Text>
          <TouchableOpacity
            style={[s.signInBtn, hasCheckedIn && s.signInBtnDone]}
            onPress={handleCheckIn}
            disabled={hasCheckedIn || checkingIn}
            activeOpacity={0.8}
          >
            {checkingIn
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.signInBtnText}>{hasCheckedIn ? '🎁 今日已签到' : '🎁 立即签到'}</Text>
            }
          </TouchableOpacity>
          {!!checkInMsg && <Text style={s.checkInMsg}>{checkInMsg}</Text>}
        </View>

        {/* Pet card */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardLabel}>我的宠物</Text>
            <TouchableOpacity onPress={fetchPet} disabled={petLoading}>
              <Text style={[s.refreshBtn, { color: theme.tint }]}>↻ 刷新</Text>
            </TouchableOpacity>
          </View>
          {petLoading ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: 12 }} />
          ) : petInfo ? (
            <PetCard
              pet={petInfo}
              theme={theme}
              actionLoading={petActionLoading}
              onPat={() => handlePetAction('pat')}
              onFeed={() => handlePetAction('feed')}
              s={s}
            />
          ) : (
            <Text style={s.emptyText}>暂未拥有宠物，敬请期待新活动~</Text>
          )}
          {!!petMsg && <Text style={s.checkInMsg}>{petMsg}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── PetCard sub-component ───────────────────────────────────────────────────

function PetCard({ pet, theme, actionLoading, onPat, onFeed, s }: any) {
  const stats = [
    { label: '等级', value: pet.level ?? '--' },
    { label: '经验', value: pet.exp ?? '--' },
    { label: '心情', value: pet.mood != null ? `${pet.mood}%` : '--' },
    { label: '饱腹', value: pet.hunger != null ? `${pet.hunger}%` : '--' },
  ];
  return (
    <View style={s.petRow}>
      {pet.petUrl ? (
        <Image source={{ uri: pet.petUrl }} style={s.petAvatar} resizeMode="contain" />
      ) : (
        <View style={[s.petAvatar, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
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
      <View style={s.petActions}>
        <TouchableOpacity
          style={[s.petActionBtn, { borderColor: theme.border }]}
          onPress={onPat}
          disabled={!!actionLoading}
        >
          {actionLoading === 'pat' ? <ActivityIndicator size="small" color={theme.tint} /> : <Text style={s.petActionEmoji}>🤚</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.petActionBtn, { borderColor: theme.border }]}
          onPress={onFeed}
          disabled={!!actionLoading}
        >
          {actionLoading === 'feed' ? <ActivityIndicator size="small" color={theme.tint} /> : <Text style={s.petActionEmoji}>🍗</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── styles factory ──────────────────────────────────────────────────────────

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
    welcomeTitle: { fontSize: 17, fontWeight: '600', color: theme.text, marginBottom: 4 },
    welcomeDate: { fontSize: 13, color: theme.icon, marginBottom: 10 },
    offWorkBadge: {
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    offWorkText: { fontSize: 14, color: theme.tint, fontWeight: '500' },
    cardLabel: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 },
    cardValue: { fontSize: 13, color: theme.text, lineHeight: 20 },
    quoteAuthor: { fontSize: 11, color: theme.icon, textAlign: 'right', marginTop: 4 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    refreshBtn: { fontSize: 13 },
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
    petAvatar: { width: 64, height: 64, borderRadius: 14 },
    petInfo: { flex: 1 },
    petName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    petStats: { flexDirection: 'row', gap: 6 },
    petStat: { flex: 1, borderRadius: 8, padding: 6, alignItems: 'center' },
    petStatLabel: { fontSize: 10, marginBottom: 2 },
    petStatValue: { fontSize: 12, fontWeight: '600' },
    petActions: { flexDirection: 'column', gap: 8 },
    petActionBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    petActionEmoji: { fontSize: 18 },
  });
