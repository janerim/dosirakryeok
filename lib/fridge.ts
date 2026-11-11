import { differenceInCalendarDays, parseISO } from 'date-fns';
import { STALE_DAYS, STORAGE_ORDER } from '@/constants/storage';
import type { Ingredient, Storage } from '@/db/types';

export type FridgeItem = Ingredient & { days: number; stale: boolean };
export type FridgeSection = { storage: Storage; data: FridgeItem[] };

/** 넣은 날을 1일째로 센다. 날짜는 yyyy-MM-dd */
export function daysStored(storedDate: string, today: string): number {
  return differenceInCalendarDays(parseISO(today), parseISO(storedDate)) + 1;
}

export function isStale(storage: Storage, days: number): boolean {
  const limit = STALE_DAYS[storage];
  return limit !== undefined && days > limit;
}

/** 소진한 재료를 빼고 보관 위치별로 묶는다. 묶음 안에서는 오래된 것부터. 빈 묶음은 뺀다. */
export function groupByStorage(ingredients: Ingredient[], today: string): FridgeSection[] {
  return STORAGE_ORDER.map((storage) => ({
    storage,
    data: ingredients
      .filter((i) => i.storage === storage && i.is_used_up === 0)
      .map((i) => {
        const days = daysStored(i.stored_date, today);
        return { ...i, days, stale: isStale(storage, days) };
      })
      .sort((a, b) => b.days - a.days || a.id - b.id),
  })).filter((s) => s.data.length > 0);
}
