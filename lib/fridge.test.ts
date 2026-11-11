import { describe, expect, it } from 'vitest';
import type { Ingredient } from '@/db/types';
import { daysStored, groupByStorage, isStale } from './fridge';

const TODAY = '2026-11-11';

const item = (over: Partial<Ingredient>): Ingredient => ({
  id: 1,
  name: '달걀',
  storage: 'fridge',
  stored_date: TODAY,
  amount: 'plenty',
  is_used_up: 0,
  ...over,
});

describe('daysStored', () => {
  it('넣은 날이 1일째다', () => {
    expect(daysStored(TODAY, TODAY)).toBe(1);
    expect(daysStored('2026-11-10', TODAY)).toBe(2);
  });

  it('달이 바뀌어도 센다', () => {
    expect(daysStored('2026-10-31', TODAY)).toBe(12);
  });
});

describe('isStale', () => {
  it('냉장은 7일을 넘으면', () => {
    expect(isStale('fridge', 7)).toBe(false);
    expect(isStale('fridge', 8)).toBe(true);
  });

  it('냉동은 30일을 넘으면', () => {
    expect(isStale('freezer', 30)).toBe(false);
    expect(isStale('freezer', 31)).toBe(true);
  });

  it('실온은 기준이 없다', () => {
    expect(isStale('room', 365)).toBe(false);
  });
});

describe('groupByStorage', () => {
  it('냉장, 냉동, 실온 순으로 묶고 빈 묶음은 뺀다', () => {
    const sections = groupByStorage(
      [item({ id: 1, storage: 'room' }), item({ id: 2, storage: 'fridge' })],
      TODAY
    );
    expect(sections.map((s) => s.storage)).toEqual(['fridge', 'room']);
  });

  it('묶음 안에서는 오래된 것부터', () => {
    const [fridge] = groupByStorage(
      [
        item({ id: 1, name: '두부', stored_date: '2026-11-10' }),
        item({ id: 2, name: '달걀', stored_date: '2026-11-01' }),
        item({ id: 3, name: '대파', stored_date: '2026-11-11' }),
      ],
      TODAY
    );
    expect(fridge.data.map((i) => i.name)).toEqual(['달걀', '두부', '대파']);
    expect(fridge.data.map((i) => i.stale)).toEqual([true, false, false]);
  });

  it('소진한 재료는 뺀다', () => {
    expect(groupByStorage([item({ is_used_up: 1 })], TODAY)).toEqual([]);
  });
});
