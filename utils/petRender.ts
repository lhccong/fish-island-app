export type PetAction = {
  name?: string;
  row: number;
  frames: number;
  duration: number;
  weight?: number;
};

/** 9 行标准 webp 精灵图默认动作（与 utools / frontend 一致） */
export const DEFAULT_SPRITE_ACTIONS: PetAction[] = [
  { name: 'Idle', row: 0, frames: 6, duration: 1100, weight: 3 },
  { name: 'Run Right', row: 1, frames: 8, duration: 700, weight: 1 },
  { name: 'Run Left', row: 2, frames: 8, duration: 700, weight: 1 },
  { name: 'Waving', row: 3, frames: 4, duration: 800, weight: 2 },
  { name: 'Jumping', row: 4, frames: 5, duration: 600, weight: 1 },
  { name: 'Failed', row: 5, frames: 8, duration: 900, weight: 1 },
  { name: 'Waiting', row: 6, frames: 6, duration: 1200, weight: 3 },
  { name: 'Running', row: 7, frames: 6, duration: 600, weight: 1 },
  { name: 'Review', row: 8, frames: 6, duration: 1000, weight: 2 },
];

export const SPRITE_FRAME_WIDTH = 192;
export const SPRITE_FRAME_HEIGHT = 208;
export const SPRITE_TOTAL_COLS = 8;
export const SPRITE_TOTAL_ROWS = 9;

export const isWebpSprite = (url?: string | null): boolean =>
  !!url && url.toLowerCase().endsWith('.webp');

export const getPetDisplayHeight = (size: number) =>
  Math.round(size * (SPRITE_FRAME_HEIGHT / SPRITE_FRAME_WIDTH));

export const pickRandomActionIndex = (
  actions: PetAction[],
  currentIndex: number,
): number => {
  if (actions.length <= 1) return 0;
  const totalWeight = actions.reduce((sum, a) => sum + (a.weight ?? 1), 0);
  let random = Math.random() * totalWeight;
  let picked = 0;
  for (let i = 0; i < actions.length; i++) {
    random -= actions[i].weight ?? 1;
    if (random <= 0) {
      picked = i;
      break;
    }
  }
  if (picked === currentIndex) {
    picked = (picked + 1 + Math.floor(Math.random() * (actions.length - 1))) % actions.length;
  }
  return picked;
};
