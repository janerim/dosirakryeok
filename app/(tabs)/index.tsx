import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { MonthNavigator } from '@/components/calendar/MonthNavigator';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { shiftMonth, useCalendarMatrix } from '@/hooks/useCalendar';

export default function CalendarScreen() {
  const [month, setMonth] = useState(() => new Date());
  const weeks = useCalendarMatrix(month);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <MonthNavigator
          date={month}
          onPrev={() => setMonth((d) => shiftMonth(d, -1))}
          onNext={() => setMonth((d) => shiftMonth(d, 1))}
        />
        <Pressable
          onPress={() => setMonth(new Date())}
          style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
          hitSlop={8}
        >
          <Text style={styles.todayBtnText}>오늘</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <CalendarGrid
          weeks={weeks}
          onSwipeLeft={() => setMonth((d) => shiftMonth(d, 1))}
          onSwipeRight={() => setMonth((d) => shiftMonth(d, -1))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  todayBtnText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
