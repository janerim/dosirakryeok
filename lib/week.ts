import { addDays, addWeeks, format, getDay, getHours, parseISO, startOfWeek } from 'date-fns';

/** 금요일 이 시각부터는 다음 주를 기본으로 보여준다 */
export const NEXT_WEEK_FROM_HOUR = 18;

const key = (d: Date) => format(d, 'yyyy-MM-dd');

/** 그 날짜가 속한 주의 월요일 (yyyy-MM-dd) */
export function mondayOf(date: Date): string {
  return key(startOfWeek(date, { weekStartsOn: 1 }));
}

/** 이번 주 탭이 처음 보여줄 주의 월요일. 금요일 저녁과 주말에는 다음 주다. */
export function defaultWeekStart(now: Date): string {
  const day = getDay(now); // 0 일 ~ 6 토
  const planNext =
    day === 6 || day === 0 || (day === 5 && getHours(now) >= NEXT_WEEK_FROM_HOUR);
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return key(planNext ? addWeeks(monday, 1) : monday);
}

/** 월요일부터 금요일까지 다섯 날짜 */
export function weekdaysOf(monday: string): string[] {
  const start = parseISO(monday);
  return [0, 1, 2, 3, 4].map((n) => key(addDays(start, n)));
}

export function shiftWeek(monday: string, delta: number): string {
  return key(addWeeks(parseISO(monday), delta));
}
