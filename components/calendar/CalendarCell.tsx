import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { DayCell } from '@/hooks/useCalendar';
import type { MealStatus } from '@/db/types';

export type CellMeal = { name: string; status: MealStatus };

type Props = {
  cell: DayCell;
  width: number;
  meal?: CellMeal;
  onPress: (cell: DayCell) => void;
};

export function CalendarCell({ cell, width, meal, onPress }: Props) {
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
    <Pressable
      onPress={() => onPress(cell)}
      style={({ pressed }) => [
        styles.cell,
        { width },
        isToday && styles.today,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.day, { color: dayColor, opacity: inMonth ? 1 : 0.35 }]}>
        {day}
      </Text>
      {meal && (
        <View style={[styles.mealArea, !inMonth && { opacity: 0.35 }]}>
          <View
            style={[
              styles.mealBox,
              meal.status === 'planned' && styles.mealPlanned,
              meal.status === 'prepared' && styles.mealPrepared,
              meal.status === 'eaten' && styles.mealEaten,
              meal.status === 'skipped' && styles.mealSkipped,
            ]}
          >
            <Text
              style={[
                styles.mealText,
                meal.status === 'eaten' && styles.mealTextEaten,
                meal.status === 'skipped' && styles.mealTextSkipped,
              ]}
              numberOfLines={3}
            >
              {meal.name}
            </Text>
            {meal.status === 'eaten' && (
              <View style={styles.marker}>
                <Text style={styles.markerText}>✓</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
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
  pressed: { opacity: 0.6 },
  day: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  mealArea: {
    flex: 1,
    width: '92%',
    marginBottom: 4,
  },
  mealBox: {
    flex: 1,
    minHeight: 32,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  // 계획: 점선 테두리 / 준비됨: 실선 테두리 / 먹음: 채움 / 건너뜀: 흐리게 + 취소선
  mealPlanned: {
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  mealPrepared: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  mealEaten: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealSkipped: {
    borderColor: Colors.textSecondary,
    borderWidth: 1.5,
    opacity: 0.6,
  },
  mealText: {
    fontSize: 10,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  mealTextEaten: { color: '#fff', fontWeight: '600' },
  mealTextSkipped: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  marker: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
});
