import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { DayCell } from '@/hooks/useCalendar';

type Props = {
  cell: DayCell;
  width: number;
};

export function CalendarCell({ cell, width }: Props) {
  const { date, inMonth, isToday, weekday } = cell;
  const day = date.getDate();

  const dayColor = !inMonth
    ? Colors.textSecondary
    : weekday === 0
      ? Colors.sunday
      : weekday === 6
        ? Colors.saturday
        : Colors.textPrimary;

  return (
    <View style={[styles.cell, { width }, isToday && styles.today]}>
      <Text style={[styles.day, { color: dayColor, opacity: inMonth ? 1 : 0.35 }]}>
        {day}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    minHeight: 120,
    paddingTop: 4,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  today: {
    backgroundColor: Colors.todayBg,
  },
  day: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
});
