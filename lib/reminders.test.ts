import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS } from '@/constants/reminders';
import type { Ingredient, MealPlan, MealStatus, Recipe } from '@/db/types';
import { buildReminders, parseReminderSettings, type ReminderSettings } from './reminders';

// 2026-11-11 은 수요일이다
const at = (date: string, time: string) => new Date(`${date}T${time}:00`);
const NOW = at('2026-11-11', '08:00');

const rice: Recipe = {
  id: 1,
  name: '달걀볶음밥',
  cook_minutes: 10,
  steps: [],
  storage_method: '냉장. 전자레인지 2분',
  storage_days: 3,
};

let nextId = 1;
const plan = (date: string, status: MealStatus = 'planned'): MealPlan => ({
  id: nextId++,
  date,
  recipe_id: rice.id,
  status,
  prev_status: null,
});
const held = (name: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id: nextId++,
  name,
  storage: 'fridge',
  stored_date: '2026-11-11',
  amount: 'plenty',
  is_used_up: 0,
  ...over,
});

const only = (kind: 'morning' | 'friday' | 'stale'): ReminderSettings => ({
  morning: { ...DEFAULT_REMINDERS.morning, enabled: kind === 'morning' },
  friday: { ...DEFAULT_REMINDERS.friday, enabled: kind === 'friday' },
  stale: { ...DEFAULT_REMINDERS.stale, enabled: kind === 'stale' },
});

const build = (
  settings: ReminderSettings,
  data: { plans?: MealPlan[]; ingredients?: Ingredient[] },
  now = NOW
) =>
  buildReminders(
    settings,
    { plans: data.plans ?? [], recipes: [rice], ingredients: data.ingredients ?? [] },
    now
  );

describe('평일 아침', () => {
  it('도시락이 있는 평일에만, 설정한 시각에 온다', () => {
    const { dated } = build(only('morning'), {
      plans: [
        plan('2026-11-12'), // 목
        plan('2026-11-14'), // 토 — 평일이 아니다
        plan('2026-11-16', 'prepared'), // 월
      ],
    });
    expect(dated).toEqual([
      {
        id: 'morning-2026-11-12',
        date: at('2026-11-12', '07:30'),
        title: '오늘 도시락 · 달걀볶음밥',
        body: '냉장. 전자레인지 2분',
      },
      {
        id: 'morning-2026-11-16',
        date: at('2026-11-16', '07:30'),
        title: '오늘 도시락 · 달걀볶음밥',
        body: '냉장. 전자레인지 2분',
      },
    ]);
  });

  it('오늘은 시각이 아직 안 지났을 때만', () => {
    const plans = [plan('2026-11-11')];
    expect(build(only('morning'), { plans }).dated).toEqual([]);
    expect(build(only('morning'), { plans }, at('2026-11-11', '07:00')).dated).toHaveLength(1);
  });

  it('먹음·건너뜀인 날은 보내지 않는다', () => {
    const plans = [plan('2026-11-12', 'eaten'), plan('2026-11-13', 'skipped')];
    expect(build(only('morning'), { plans }).dated).toEqual([]);
  });

  it('14일 뒤부터는 아직 예약하지 않는다', () => {
    const plans = [plan('2026-11-24'), plan('2026-11-25')]; // 오늘 + 13일, + 14일
    expect(build(only('morning'), { plans }).dated.map((r) => r.id)).toEqual([
      'morning-2026-11-24',
    ]);
  });

  it('바꾼 시각을 따른다', () => {
    const settings = only('morning');
    settings.morning = { enabled: true, hour: 6, minute: 5 };
    const { dated } = build(settings, { plans: [plan('2026-11-12')] });
    expect(dated[0].date).toEqual(at('2026-11-12', '06:05'));
  });
});

describe('금요일 저녁', () => {
  it('매주 금요일 설정한 시각에 반복한다', () => {
    expect(build(only('friday'), {}).weekly).toEqual([
      {
        id: 'friday',
        weekday: 5,
        hour: 18,
        minute: 0,
        title: '다음 주 도시락을 계획할 시간',
        body: '이번 주말에 준비할 메뉴를 골라 보세요.',
      },
    ]);
  });

  it('끄면 없다', () => {
    expect(build(only('morning'), {}).weekly).toEqual([]);
  });
});

describe('오래된 재료', () => {
  it('토요일마다 그날 기준으로 오래된 재료가 있을 때만 온다', () => {
    const { dated } = build(only('stale'), {
      ingredients: [
        // 11-14(토) 에 7일째라 아직, 11-21(토) 에는 14일째
        held('두부', { stored_date: '2026-11-08' }),
      ],
    });
    expect(dated).toEqual([
      {
        id: 'stale-2026-11-21',
        date: at('2026-11-21', '10:00'),
        title: '오래된 재료 1개',
        body: '두부(냉장 14일째)',
      },
    ]);
  });

  it('오래된 것부터 세 개까지 적고 나머지는 개수만', () => {
    const { dated } = build(only('stale'), {
      ingredients: [
        held('두부', { stored_date: '2026-11-01' }),
        held('다진 고기', { storage: 'freezer', stored_date: '2026-10-01' }),
        held('대파', { stored_date: '2026-11-05' }),
        held('양파', { stored_date: '2026-11-03' }),
        held('달걀'), // 아직 새것
      ],
    });
    expect(dated[0]).toMatchObject({
      id: 'stale-2026-11-14',
      title: '오래된 재료 4개',
      body: '다진 고기(냉동 45일째), 두부(냉장 14일째), 양파(냉장 12일째) 외 1개',
    });
  });

  it('소진했거나 남은 양이 없음인 재료는 세지 않는다', () => {
    const ingredients = [
      held('두부', { stored_date: '2026-11-01', is_used_up: 1 }),
      held('대파', { stored_date: '2026-11-01', amount: 'none' }),
    ];
    expect(build(only('stale'), { ingredients }).dated).toEqual([]);
  });

  it('실온 재료는 기준이 없어 세지 않는다', () => {
    const ingredients = [held('감자', { storage: 'room', stored_date: '2026-09-01' })];
    expect(build(only('stale'), { ingredients }).dated).toEqual([]);
  });
});

describe('parseReminderSettings', () => {
  it('저장된 것이 없으면 기본값', () => {
    expect(parseReminderSettings(null)).toEqual(DEFAULT_REMINDERS);
  });

  it('저장된 항목만 덮어쓴다', () => {
    const raw = JSON.stringify({ morning: { enabled: false, hour: 6, minute: 0 } });
    expect(parseReminderSettings(raw)).toEqual({
      ...DEFAULT_REMINDERS,
      morning: { enabled: false, hour: 6, minute: 0 },
    });
  });
});
