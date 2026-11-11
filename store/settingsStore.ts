import { create } from 'zustand';
import { DEFAULT_REMINDERS, REMINDERS_KEY } from '@/constants/reminders';
import { getDB } from '@/db/database';
import { getSetting, setSetting } from '@/db/setting';
import {
  parseReminderSettings,
  type Reminder,
  type ReminderKind,
  type ReminderSettings,
} from '@/lib/reminders';

type SettingsStore = {
  reminders: ReminderSettings;
  load: () => Promise<void>;
  setReminder: (kind: ReminderKind, patch: Partial<Reminder>) => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  reminders: DEFAULT_REMINDERS,
  load: async () => {
    const raw = await getSetting(await getDB(), REMINDERS_KEY);
    set({ reminders: parseReminderSettings(raw) });
  },
  setReminder: async (kind, patch) => {
    const current = get().reminders;
    const next = { ...current, [kind]: { ...current[kind], ...patch } };
    // 알림 예약은 DB 를 읽으므로 저장을 먼저 끝낸다
    await setSetting(await getDB(), REMINDERS_KEY, JSON.stringify(next));
    set({ reminders: next });
  },
}));
