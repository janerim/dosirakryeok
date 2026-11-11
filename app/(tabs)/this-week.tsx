import { useEffect, useState } from 'react';
import { ActionSheetIOS, Pressable, StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { MEAL_STATUS_LABELS } from '@/constants/meal';
import { WeekNavigator } from '@/components/week/WeekNavigator';
import { defaultWeekStart, weekdaysOf } from '@/lib/week';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { useRecipeStore } from '@/store/recipeStore';
import type { MealPlan } from '@/db/types';

export default function ThisWeekScreen() {
  const [weekStart, setWeekStart] = useState(() => defaultWeekStart(new Date()));
  const { plans, refresh: refreshPlans, clear, prepare } = useMealPlanStore();
  const { recipes, refresh } = useRecipeStore();
  const days = weekdaysOf(weekStart);
  const hasPlanned = plans.some((p) => days.includes(p.date) && p.status === 'planned');

  useEffect(() => {
    refresh().then(refreshPlans).catch(console.error);
  }, [refresh, refreshPlans]);

  const onLongPress = (plan: MealPlan, title: string) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: ['비우기', '취소'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
      (index) => {
        if (index === 0) clear(plan.id).catch(console.error);
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />

      {days.map((date) => {
        const plan = plans.find((p) => p.date === date);
        const name = plan ? recipes.find((r) => r.id === plan.recipe_id)?.name : undefined;
        const dayLabel = format(parseISO(date), 'EEE', { locale: ko });
        return (
          <Pressable
            key={date}
            onPress={() => router.push({ pathname: '/menu-select', params: { date } })}
            onLongPress={plan ? () => onLongPress(plan, `${dayLabel}요일`) : undefined}
            style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
          >
            <View style={styles.slotDay}>
              <Text style={styles.slotDayName}>{dayLabel}</Text>
              <Text style={styles.slotDate}>{format(parseISO(date), 'M/d')}</Text>
            </View>
            <Text style={[styles.slotMenu, !plan && styles.slotEmpty]} numberOfLines={1}>
              {plan ? name : '메뉴 고르기'}
            </Text>
            {plan && plan.status !== 'planned' && (
              <Text style={styles.slotStatus}>{MEAL_STATUS_LABELS[plan.status]}</Text>
            )}
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => prepare(days[0], days[4]).catch(console.error)}
        disabled={!hasPlanned}
        style={({ pressed }) => [
          styles.prepareBtn,
          (pressed || !hasPlanned) && styles.prepareBtnOff,
        ]}
      >
        <Text style={styles.prepareBtnText}>준비 완료</Text>
      </Pressable>

      <Text style={styles.hint}>칸을 길게 누르면 비울 수 있습니다</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { opacity: 0.6 },
  slotDay: { width: 40, alignItems: 'center' },
  slotDayName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  slotDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  slotMenu: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  slotEmpty: { fontWeight: '400', color: Colors.textSecondary },
  slotStatus: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chevron: { fontSize: 22, color: Colors.textSecondary },
  prepareBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  prepareBtnOff: { opacity: 0.4 },
  prepareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
