export type PointsGameKey = 'stock' | 'tournament' | 'tower' | 'farm';

export const POINTS_GAMES: {
  key: PointsGameKey;
  title: string;
  subtitle: string;
  icon: string;
  path: string;
  accent: string;
  bg: string;
}[] = [
  {
    key: 'stock',
    title: '摸鱼股市',
    subtitle: '用积分交易 A 股主要指数',
    icon: '📈',
    path: '/points/stock',
    accent: '#cf1322',
    bg: '#fff1f0',
  },
  {
    key: 'tournament',
    title: '武道大会',
    subtitle: '挑战强者，登顶巅峰',
    icon: '🏆',
    path: '/points/tournament',
    accent: '#fa8c16',
    bg: '#fff7e6',
  },
  {
    key: 'tower',
    title: '无尽爬塔',
    subtitle: '带领宠物挑战无尽高塔',
    icon: '🗼',
    path: '/points/tower',
    accent: '#722ed1',
    bg: '#f9f0ff',
  },
  {
    key: 'farm',
    title: '摸鱼农场',
    subtitle: '种下希望，收获积分',
    icon: '🌾',
    path: '/points/farm',
    accent: '#52c41a',
    bg: '#f6ffed',
  },
];
