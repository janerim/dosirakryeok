import { addDays, format, getDay, set, startOfDay } from 'date-fns';
import {
  DEFAULT_REMINDERS,
  REMINDER_DAYS_AHEAD,
  STALE_REMINDER_WEEKDAY,
} from '@/constants/reminders';
import { STORAGE_LABELS } from '@/constants/storage';
import type { Ingredient, MealPlan, Recipe } from '@/db/types';
import { daysStored, isStale } from './fridge';

export type Reminder = { enabled: boolean; hour: number; minute: number };
export type ReminderKind = 'morning' | 'friday' | 'stale';
export type ReminderSettings = Record<ReminderKind, Reminder>;

/** 한 번만 오는 알림 */
export type DatedReminder = { id: string; date: Date; title: string; body: string };
/** 매주 같은 요일·시각에 오는 알림. weekday 는 Date.getDay (0 일 ~ 6 토) */
export type WeeklyReminder = {
  id: string;
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

/** 저장된 설정을 읽는다. 저장되지 않은 항목은 기본값이다. */
export function parseReminderSettings(raw: string | null): ReminderSettings {
  const saved: Partial<ReminderSettings> = raw ? JSON.parse(raw) : {};
  return {
    morning: { ...DEFAULT_REMINDERS.morning, ...saved.morning },
    friday: { ...DEFAULT_REMINDERS.friday, ...saved.friday },
    stale: { ...DEFAULT_REMINDERS.stale, ...saved.stale },
  };
}

const MAX_STALE_NAMES = 3;

/**
 * 지금(now) 이후에 예약할 알림을 만든다.
 * - 평일 아침: 오늘부터 REMINDER_DAYS_AHEAD 일 안의 월~금 중 계획·준비됨 도시락이 있는 날
 * - 금요일 저녁: 매주 반복
 * - 오래된 재료: 같은 기간 안의 토요일마다, 그날 기준으로 오래된 재료가 있으면
 * 계획과 재고는 앱에서만 바뀌므로 지금 DB 로 미래의 내용을 미리 정할 수 있다. 바뀌면 다시 만든다.
 */
export function buildReminders(
  settings: ReminderSettings,
  data: { plans: MealPlan[]; recipes: Recipe[]; ingredients: Ingredient[] },
  now: Date
): { dated: DatedReminder[]; weekly: WeeklyReminder[] } {
  const dated: DatedReminder[] = [];
  const today = startOfDay(now);
  const at = (day: Date, r: Reminder) =>
    set(day, { hours: r.hour, minutes: r.minute, seconds: 0, milliseconds: 0 });

  for (let d = 0; d < REMINDER_DAYS_AHEAD; d++) {
    const day = addDays(today, d);
    const key = format(day, 'yyyy-MM-dd');
    const weekday = getDay(day);

    if (settings.morning.enabled && weekday >= 1 && weekday <= 5) {
      const date = at(day, settings.morning);
      const plan = data.plans.find(
        (p) => p.date === key && (p.status === 'planned' || p.status === 'prepared')
      );
      const recipe = plan && data.recipes.find((r) => r.id === plan.recipe_id);
      if (date > now && recipe) {
        dated.push({
          id: `morning-${key}`,
          date,
          title: `오늘 도시락 · ${recipe.name}`,
          body: recipe.storage_method,
        });
      }
    }

    if (settings.stale.enabled && weekday === STALE_REMINDER_WEEKDAY) {
      const date = at(day, settings.stale);
      const stale = data.ingredients
        .filter((i) => i.is_used_up === 0 && i.amount !== 'none' && i.stored_date <= key)
        .map((i) => ({ ...i, days: daysStored(i.stored_date, key) }))
        .filter((i) => isStale(i.storage, i.days))
        .sort((a, b) => b.days - a.days || a.id - b.id);
      if (date > now && stale.length > 0) {
        const names = stale
          .slice(0, MAX_STALE_NAMES)
          .map((i) => `${i.name}(${STORAGE_LABELS[i.storage]} ${i.days}일째)`)
          .join(', ');
        const rest = stale.length - MAX_STALE_NAMES;
        dated.push({
          id: `stale-${key}`,
          date,
          title: `오래된 재료 ${stale.length}개`,
          body: rest > 0 ? `${names} 외 ${rest}개` : names,
        });
      }
    }
  }

  const weekly: WeeklyReminder[] = settings.friday.enabled
    ? [
        {
          id: 'friday',
          weekday: 5,
          hour: settings.friday.hour,
          minute: settings.friday.minute,
          title: '다음 주 도시락을 계획할 시간',
          body: '이번 주말에 준비할 메뉴를 골라 보세요.',
        },
      ]
    : [];

  return { dated, weekly };
}
