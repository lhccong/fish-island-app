import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/constants/api';
import holiday2026 from '@/assets/data/2026-holiday.json';

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

export type TimeInfoType = 'beforeWork' | 'lunch' | 'work' | 'holiday';

export interface TimeInfo {
  type: TimeInfoType;
  timeRemaining: string;
  earnedAmount?: number;
}

export interface HolidayInfo {
  name: string;
  date: string;
}

interface HolidayDay {
  name: string;
  date: string;
  isOffDay?: boolean;
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

/** 解析 YYYY-MM-DD 为本地零点，避免 UTC 偏移 */
export function parseLocalDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, 0, 0, 0, 0);
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
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

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours <= 0 && minutes <= 0 && seconds <= 0) return '00:00:00';
  return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
}

function calcEarnedAmount(
  settings: MoYuSettings,
  now: Date,
  start: Date,
  end: Date,
): number | undefined {
  let workHoursPerDay = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (workHoursPerDay <= 0) workHoursPerDay = 8;

  const workDaysPerMonth = settings.workdayType === 'single' ? 26 : 22;
  const monthlyWorkHours = workDaysPerMonth * workHoursPerDay;
  const hourlyRate =
    settings.monthlySalary && monthlyWorkHours > 0
      ? settings.monthlySalary / monthlyWorkHours
      : 0;
  if (hourlyRate <= 0) return undefined;

  let workedHours = 0;
  if (now > start && now < end) {
    workedHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  } else if (now >= end) {
    workedHours = workHoursPerDay;
  }
  return hourlyRate * workedHours;
}

const LUNCH_BREAK_MS = 60 * 60 * 1000;

export function computeTimeInfo(settings: MoYuSettings, now = new Date()): TimeInfo {
  if (!isWorkday(settings, now)) {
    return { type: 'holiday', timeRemaining: '今天休息，好好放松一下吧~' };
  }

  const start = setHm(now, settings.startTime);
  const end = setHm(now, settings.endTime);
  const lunchAt = setHm(now, settings.lunchTime);
  const earnedAmount = calcEarnedAmount(settings, now, start, end);

  if (now < start) {
    const remain = start.getTime() - now.getTime();
    return { type: 'beforeWork', timeRemaining: formatDuration(remain), earnedAmount };
  }

  if (now < lunchAt) {
    const remain = lunchAt.getTime() - now.getTime();
    return { type: 'lunch', timeRemaining: formatDuration(remain), earnedAmount };
  }

  if (now < new Date(lunchAt.getTime() + LUNCH_BREAK_MS)) {
    return { type: 'lunch', timeRemaining: '已到午餐时间', earnedAmount };
  }

  if (now < end) {
    const remain = end.getTime() - now.getTime();
    return { type: 'work', timeRemaining: formatDuration(remain), earnedAmount };
  }

  return { type: 'work', timeRemaining: '已到下班时间', earnedAmount };
}

export function getTimeInfoLabel(info: TimeInfo): string {
  if (info.type === 'holiday') return info.timeRemaining;
  if (info.type === 'beforeWork') {
    return `距离上班还有 ${info.timeRemaining}`;
  }
  if (info.type === 'lunch') {
    if (info.timeRemaining === '已到午餐时间') return '已到午餐时间';
    return `距离午餐还有 ${info.timeRemaining}`;
  }
  if (info.timeRemaining === '已到下班时间') return '今天辛苦了，好好休息吧！';
  return `距离下班还有 ${info.timeRemaining}`;
}

export function getTimeInfoEmoji(info: TimeInfo): string {
  if (info.type === 'holiday') return '🏖️';
  if (info.type === 'beforeWork') return '⏰';
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

function findNextHolidayFromDays(days: HolidayDay[], now = new Date()): HolidayInfo | null {
  const today = startOfLocalDay(now);
  const next = days.find((day) => {
    if (!day.isOffDay) return false;
    const d = parseLocalDate(day.date);
    return d.getTime() >= today.getTime();
  });
  if (!next) return null;
  return { date: next.date, name: next.name };
}

async function fetchHolidayJson(year: number): Promise<HolidayDay[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/data/${year}-holiday.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.days || null;
  } catch {
    return null;
  }
}

export async function fetchHolidayInfo(): Promise<HolidayInfo | null> {
  const now = new Date();
  const year = now.getFullYear();

  for (const y of [year, year + 1]) {
    let days = await fetchHolidayJson(y);
    if (!days && y === 2026) {
      days = (holiday2026 as { days: HolidayDay[] }).days;
    }
    const next = days ? findNextHolidayFromDays(days, now) : null;
    if (next) return next;
  }

  try {
    const nextRes = await fetch('https://timor.tech/api/holiday/next');
    const nextData = await nextRes.json();
    if (nextData?.holiday?.date && nextData?.holiday?.name) {
      return { date: nextData.holiday.date, name: nextData.holiday.name };
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function formatHolidayCountdown(info: HolidayInfo, now = new Date()): string {
  const target = parseLocalDate(info.date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `距离${info.name}还有 ${diffDays} 天`;
  }

  if (diffDays === 0 && now < target) {
    const remain = target.getTime() - now.getTime();
    return `距离${info.name}还有 ${formatDuration(remain)}`;
  }

  if (diffDays === 0) {
    return `今天是${info.name}，节日快乐！`;
  }

  return '假期已到 🎉';
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
