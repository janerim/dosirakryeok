import type { MealStatus } from '@/db/types';

export const MEAL_STATUS_LABELS: Record<MealStatus, string> = {
  planned: '계획',
  prepared: '준비됨',
  eaten: '먹음',
  skipped: '건너뜀',
};
