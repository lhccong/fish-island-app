import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/constants/api';

const MOYU_STORAGE_KEY = 'moYuData';

export type MoYuWorkdayType = 'single' | 'double' | 'mixed';

export interface MoYuSettings {
  startTime: string;
  endTime: string;
  lunchTime: string;
  workdayType: MoYuWorkdayType;
  monthlySalary?: number;
}

export const DEFAULT_MOYU_SETTINGS: MoYuSettings = {
  startTime: '09:00',
  endTime: '17:30',
  lunchTime: '12:00',
  workdayType: 'double',
};

export type TimeInfoType = 'lunch' | 'work' | 'holiday';

export interface TimeInfo {
  type: TimeInfoType;
  timeRemaining: string;
  earnedAmount?: number;
}

export interface HolidayInfo {
  name: string;
  date: string;
}

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

function setHm(base: Date, hm: string): Date {
  const { h, m } = parseHm(hm);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatRelativeTime(timeString?: string): string {
  if (!timeString) return '';
  const time = new Date(timeString.replace(/-/g, '/'));
  if (isNaN(time.getTime())) return '';
  const now = Date.now();
  const diffMin = Math.floor((now - time.getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffH < 24) return `${diffH}小时前`;
  if (diffD === 1) return '昨天';
  if (diffD < 7) return `${diffD}天前`;
  return `${time.getMonth() + 1}月${time.getDate()}日`;
}

export function isWorkday(settings: MoYuSettings, date = new Date()): boolean {
  const day = date.getDay();
  if (settings.workdayType === 'single') return day !== 0;
  if (settings.workdayType === 'double') return day !== 0 && day !== 6;
  return day !== 0 && day !== 6;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours <= 0 && minutes <= 0 && seconds <= 0) return '00:00:00';
  return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function computeTimeInfo(settings: MoYuSettings, now = new Date()): TimeInfo {
  if (!isWorkday(settings, now)) {
    return { type: 'holiday', timeRemaining: '今天休息，好好放松一下吧~' };
  }

  const start = setHm(now, settings.startTime);
  const end = setHm(now, settings.endTime);
  const lunchAt = setHm(now, settings.lunchTime);

  let workHoursPerDay = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (workHoursPerDay <= 0) workHoursPerDay = 8;

  const workDaysPerMonth = settings.workdayType === 'single' ? 26 : 22;
  const monthlyWorkHours = workDaysPerMonth * workHoursPerDay;
  const hourlyRate =
    settings.monthlySalary && monthlyWorkHours > 0
      ? settings.monthlySalary / monthlyWorkHours
      : 0;

  let workedHours = 0;
  if (now > start && now < end) {
    workedHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  } else if (now >= end) {
    workedHours = workHoursPerDay;
  }
  const earnedAmount = hourlyRate > 0 ? hourlyRate * workedHours : undefined;

  const lunchDiffMin = (now.getTime() - lunchAt.getTime()) / (1000 * 60);
  const isNearLunch = Math.abs(lunchDiffMin) <= 120 && lunchDiffMin <= 60;

  if (isNearLunch) {
    const remain = lunchAt.getTime() - now.getTime();
    if (remain <= 0) {
      return { type: 'lunch', timeRemaining: '已到午餐时间', earnedAmount };
    }
    return { type: 'lunch', timeRemaining: formatDuration(remain), earnedAmount };
  }

  const remain = end.getTime() - now.getTime();
  if (remain <= 0) {
    return { type: 'work', timeRemaining: '已到下班时间', earnedAmount };
  }
  return { type: 'work', timeRemaining: formatDuration(remain), earnedAmount };
}

export function getTimeInfoLabel(info: TimeInfo): string {
  if (info.type === 'holiday') return info.timeRemaining;
  if (info.type === 'lunch') {
    if (info.timeRemaining === '已到午餐时间') return '已到午餐时间';
    return `距离午餐还有 ${info.timeRemaining}`;
  }
  if (info.timeRemaining === '已到下班时间') return '今天辛苦了，好好休息吧！';
  return `距离下班还有 ${info.timeRemaining}`;
}

export function getTimeInfoEmoji(info: TimeInfo): string {
  if (info.type === 'holiday') return '🏖️';
  if (info.type === 'lunch') return '🍱';
  return '🧑‍💻';
}

export async function loadMoYuSettings(): Promise<MoYuSettings> {
  try {
    const raw = await AsyncStorage.getItem(MOYU_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MOYU_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MoYuSettings>;
    return { ...DEFAULT_MOYU_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_MOYU_SETTINGS };
  }
}

export async function saveMoYuSettings(settings: MoYuSettings): Promise<void> {
  await AsyncStorage.setItem(MOYU_STORAGE_KEY, JSON.stringify(settings));
}

export async function fetchHolidayInfo(): Promise<HolidayInfo | null> {
  try {
    const res = await fetch(`${BASE_URL}/data/2026-holiday.json`);
    const data = await res.json();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next = (data.days || []).find((day: { date: string; isOffDay?: boolean }) => {
      if (!day.isOffDay) return false;
      const d = new Date(day.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= now.getTime();
    });
    if (next) return { date: next.date, name: next.name };
  } catch {
    /* fallback below */
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const res = await fetch(`https://timor.tech/api/holiday/info/${todayStr}`);
    const data = await res.json();
    if (data.code === 0 && data.holiday?.holiday) {
      return { date: todayStr, name: data.holiday.name };
    }
    const nextRes = await fetch('https://timor.tech/api/holiday/next');
    const nextData = await nextRes.json();
    if (nextData.holiday) {
      return { date: nextData.holiday.date, name: nextData.holiday.name };
    }
  } catch {
    /* ignore */
  }

  return { date: '2026-05-01', name: '劳动节' };
}

export function formatHolidayCountdown(info: HolidayInfo, now = new Date()): string {
  const target = new Date(info.date);
  target.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `今天是${info.name}，节日快乐！`;
  if (diffDays < 0) return `今天是${info.name}，节日快乐！`;
  if (diffDays > 0) return `距离${info.name}还有 ${diffDays} 天`;
  const remain = target.getTime() - now.getTime();
  if (remain <= 0) return '假期已到 🎉';
  return `距离${info.name}还有 ${formatDuration(remain)}`;
}

export function getGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 6) return '凌晨好';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 17) return '下午好';
  if (h < 19) return '傍晚好';
  return '晚上好';
}

export function getTodayStr(now = new Date()): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${week[now.getDay()]}`;
}
