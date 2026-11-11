import type { Amount, Storage } from '@/db/types';

/** 냉장고 탭에 보여주는 순서 */
export const STORAGE_ORDER: Storage[] = ['fridge', 'freezer', 'room'];

export const STORAGE_LABELS: Record<Storage, string> = {
  fridge: '냉장',
  freezer: '냉동',
  room: '실온',
};

export const AMOUNT_LABELS: Record<Amount, string> = {
  plenty: '넉넉',
  little: '조금',
  none: '없음',
};

/** 넣은 지 이 일수를 넘으면 강조한다. 실온은 기준이 없다. */
export const STALE_DAYS: Partial<Record<Storage, number>> = {
  fridge: 7,
  freezer: 30,
};

/** 상단 칩으로 보여주는 자주 등록한 재료 개수 */
export const FREQUENT_LIMIT = 8;
