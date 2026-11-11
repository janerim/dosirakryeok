import { useMemo } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type DayCell = {
  date: Date;
  dateKey: string; // yyyy-MM-dd
  inMonth: boolean;
  isToday: boolean;
  weekday: number; // 0 Sun ~ 6 Sat
};

const WEEK_STARTS_ON = 1; // Monday

export function useCalendarMatrix(currentMonth: Date) {
  return useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
    const today = new Date();

    const days: DayCell[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push({
        date: new Date(cursor),
        dateKey: format(cursor, 'yyyy-MM-dd'),
        inMonth: isSameMonth(cursor, currentMonth),
        isToday: isSameDay(cursor, today),
        weekday: cursor.getDay(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [currentMonth]);
}

export function shiftMonth(date: Date, delta: number): Date {
  return addMonths(date, delta);
}

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
