import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { STALE_DAYS } from '@/constants/storage';
import { notificationsBlocked } from '@/lib/notify';
import { useSettingsStore } from '@/store/settingsStore';
import type { ReminderKind } from '@/lib/reminders';

const ROWS: { kind: ReminderKind; title: string; desc: string }[] = [
  {
    kind: 'morning',
    title: '평일 아침',
    desc: '오늘 도시락 이름과 보관 방법. 도시락이 없는 날은 오지 않아요.',
  },
  {
    kind: 'friday',
    title: '금요일 저녁',
    desc: '다음 주 도시락을 계획하라고 알려 줘요.',
  },
  {
    kind: 'stale',
    title: '오래된 재료',
    desc: `토요일마다, 냉장 ${STALE_DAYS.fridge}일 · 냉동 ${STALE_DAYS.freezer}일을 넘긴 재료가 있을 때만 와요.`,
  },
];

export default function SettingsScreen() {
  const { reminders, load, setReminder } = useSettingsStore();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    load().catch(console.error);
    notificationsBlocked().then(setBlocked).catch(console.error);
  }, [load]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {blocked && (
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>
            알림이 꺼져 있어 아래 설정을 켜도 오지 않아요. 설정 앱에서 도시락력의 알림을 허용해 주세요.
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={({ pressed }) => [styles.blockedBtn, pressed && styles.pressed]}
          >
            <Text style={styles.blockedBtnText}>설정 열기</Text>
          </Pressable>
        </View>
      )}

      {ROWS.map(({ kind, title, desc }) => {
        const r = reminders[kind];
        const time = new Date();
        time.setHours(r.hour, r.minute, 0, 0);
        return (
          <View key={kind} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Switch
                value={r.enabled}
                onValueChange={(enabled) => setReminder(kind, { enabled }).catch(console.error)}
                trackColor={{ true: Colors.primary }}
              />
            </View>
            <Text style={styles.cardDesc}>{desc}</Text>
            <View style={[styles.timeRow, !r.enabled && styles.dimmed]}>
              <Text style={styles.timeLabel}>시각</Text>
              <DateTimePicker
                value={time}
                mode="time"
                display="compact"
                locale="ko-KR"
                disabled={!r.enabled}
                onChange={(_, picked) => {
                  if (!picked) return;
                  setReminder(kind, {
                    hour: picked.getHours(),
                    minute: picked.getMinutes(),
                  }).catch(console.error);
                }}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12 },
  pressed: { opacity: 0.6 },
  dimmed: { opacity: 0.4 },
  blocked: {
    padding: 14,
    gap: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  blockedText: { fontSize: 13, lineHeight: 19, color: Colors.textPrimary },
  blockedBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.accent,
  },
  blockedBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  card: {
    padding: 14,
    gap: 6,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardDesc: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
