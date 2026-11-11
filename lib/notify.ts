import * as Notifications from 'expo-notifications';
import { addDays, format } from 'date-fns';
import { REMINDER_DAYS_AHEAD, REMINDERS_KEY } from '@/constants/reminders';
import { getDB } from '@/db/database';
import { listIngredients } from '@/db/ingredient';
import { listMealPlans } from '@/db/mealPlan';
import { listRecipes } from '@/db/recipe';
import { getSetting } from '@/db/setting';
import { buildReminders, parseReminderSettings } from './reminders';

// 앱을 보고 있을 때 온 알림도 배너로 띄운다
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 알림 권한을 사용자가 막았는지. 막았으면 앱 안에서는 다시 물을 수 없다. */
export async function notificationsBlocked(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return !p.granted && !p.canAskAgain;
}

async function ensurePermission(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return true;
  if (!p.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** 예약된 알림을 모두 지우고 지금의 설정·계획·재고로 다시 예약한다 */
async function sync(): Promise<void> {
  const db = await getDB();
  const settings = parseReminderSettings(await getSetting(db, REMINDERS_KEY));
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!Object.values(settings).some((r) => r.enabled)) return;
  if (!(await ensurePermission())) return;

  const now = new Date();
  const { dated, weekly } = buildReminders(
    settings,
    {
      plans: await listMealPlans(
        db,
        format(now, 'yyyy-MM-dd'),
        format(addDays(now, REMINDER_DAYS_AHEAD), 'yyyy-MM-dd')
      ),
      recipes: await listRecipes(db),
      ingredients: await listIngredients(db),
    },
    now
  );

  for (const r of dated) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
    });
  }
  for (const r of weekly) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: r.weekday + 1, // expo 는 1 이 일요일
        hour: r.hour,
        minute: r.minute,
      },
    });
  }
}

// 지우고 다시 예약하는 도중에 또 불리면 섞이므로 한 줄로 세운다
let queue: Promise<void> = Promise.resolve();

export function syncReminders(): Promise<void> {
  const next = queue.then(sync);
  queue = next.catch(() => {});
  return next;
}
