import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { mondayOf, shiftWeek, weekdaysOf } from '@/lib/week';

type Props = {
  /** 보고 있는 주의 월요일 (yyyy-MM-dd) */
  weekStart: string;
  onChange: (weekStart: string) => void;
};

export function WeekNavigator({ weekStart, onChange }: Props) {
  const days = weekdaysOf(weekStart);
  const thisMonday = mondayOf(new Date());
  const label =
    weekStart === thisMonday
      ? '이번 주'
      : weekStart === shiftWeek(thisMonday, 1)
        ? '다음 주'
        : null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(shiftWeek(weekStart, -1))}
        hitSlop={12}
        style={styles.arrow}
        accessibilityRole="button"
        accessibilityLabel="이전 주"
      >
        <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.title}>
          {format(parseISO(days[0]), 'M월 d일')} ~ {format(parseISO(days[4]), 'M월 d일')}
        </Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
      <Pressable
        onPress={() => onChange(shiftWeek(weekStart, 1))}
        hitSlop={12}
        style={styles.arrow}
        accessibilityRole="button"
        accessibilityLabel="다음 주"
      >
        <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  arrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  label: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
