import { describe, expect, it } from 'vitest';
import { defaultWeekStart, mondayOf, shiftWeek, weekdaysOf } from './week';

// 2026-11-09 는 월요일이다
const at = (date: string, hour = 12) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);

describe('defaultWeekStart', () => {
  it('월요일부터 금요일 낮까지는 이번 주', () => {
    expect(defaultWeekStart(at('2026-11-09'))).toBe('2026-11-09');
    expect(defaultWeekStart(at('2026-11-11'))).toBe('2026-11-09');
    expect(defaultWeekStart(at('2026-11-13', 17))).toBe('2026-11-09');
  });

  it('금요일 저녁부터는 다음 주', () => {
    expect(defaultWeekStart(at('2026-11-13', 18))).toBe('2026-11-16');
  });

  it('주말에도 다음 주', () => {
    expect(defaultWeekStart(at('2026-11-14'))).toBe('2026-11-16');
    expect(defaultWeekStart(at('2026-11-15', 23))).toBe('2026-11-16');
  });
});

describe('주 계산', () => {
  it('일요일은 그 전 월요일의 주에 속한다', () => {
    expect(mondayOf(at('2026-11-15'))).toBe('2026-11-09');
  });

  it('월요일부터 금요일까지 다섯 날짜', () => {
    expect(weekdaysOf('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
    ]);
  });

  it('주를 앞뒤로 넘긴다', () => {
    expect(shiftWeek('2026-11-09', 1)).toBe('2026-11-16');
    expect(shiftWeek('2026-11-09', -1)).toBe('2026-11-02');
  });
});
