import type { ReminderSettings } from '@/lib/reminders';

/** setting 테이블에 알림 설정을 저장하는 키 */
export const REMINDERS_KEY = 'reminders';

export const DEFAULT_REMINDERS: ReminderSettings = {
  morning: { enabled: true, hour: 7, minute: 30 },
  friday: { enabled: true, hour: 18, minute: 0 },
  stale: { enabled: true, hour: 10, minute: 0 },
};

/** 오래된 재료 알림을 보내는 요일 (Date.getDay: 0 일 ~ 6 토). 장보기 전인 토요일 */
export const STALE_REMINDER_WEEKDAY = 6;

/**
 * 날짜마다 내용이 다른 알림(평일 아침, 오래된 재료)은 오늘부터 이 일수만큼만 미리 예약한다.
 * 앱을 열거나 계획·재고가 바뀔 때마다 다시 예약한다. iOS 는 예약을 64개까지만 받는다.
 */
export const REMINDER_DAYS_AHEAD = 14;
