import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { MEAL_STATUS_LABELS } from '@/constants/meal';
import { MonthNavigator } from '@/components/calendar/MonthNavigator';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import type { CellMeal } from '@/components/calendar/CalendarCell';
import { shiftMonth, useCalendarMatrix } from '@/hooks/useCalendar';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { useRecipeStore } from '@/store/recipeStore';
import type { MealStatus } from '@/db/types';

export default function CalendarScreen() {
  const [month, setMonth] = useState(() => new Date());
  // 누른 날짜 (yyyy-MM-dd). 시트는 스토어의 최신 식단을 다시 찾아 보여준다
  const [selected, setSelected] = useState<string | null>(null);
  const weeks = useCalendarMatrix(month);
  const { plans, refresh, eat, skip, undo } = useMealPlanStore();
  const { recipes, refresh: refreshRecipes } = useRecipeStore();

  useEffect(() => {
    refreshRecipes().then(refresh).catch(console.error);
  }, [refresh, refreshRecipes]);

  const meals = useMemo(() => {
    const byDate: Record<string, CellMeal> = {};
    for (const p of plans) {
      const recipe = recipes.find((r) => r.id === p.recipe_id);
      if (recipe) byDate[p.date] = { name: recipe.name, status: p.status };
    }
    return byDate;
  }, [plans, recipes]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const plan = selected ? plans.find((p) => p.date === selected) : undefined;
  const recipe = plan ? recipes.find((r) => r.id === plan.recipe_id) : undefined;
  const isOpen = plan?.status === 'planned' || plan?.status === 'prepared';
  const close = () => setSelected(null);

  const statusColor = (s: MealStatus) =>
    s === 'eaten' ? Colors.primary : s === 'skipped' ? Colors.textSecondary : Colors.accent;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <MonthNavigator
          date={month}
          onPrev={() => setMonth((d) => shiftMonth(d, -1))}
          onNext={() => setMonth((d) => shiftMonth(d, 1))}
        />
        <View style={styles.topRight}>
          <Pressable
            onPress={() => setMonth(new Date())}
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.todayBtnText}>오늘</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => pressed && styles.pressed}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="알림 설정"
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <CalendarGrid
          weeks={weeks}
          meals={meals}
          onPressDay={(cell) => setSelected(cell.dateKey)}
          onSwipeLeft={() => setMonth((d) => shiftMonth(d, 1))}
          onSwipeRight={() => setMonth((d) => shiftMonth(d, -1))}
        />
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {selected && (
              <>
                <Text style={styles.sheetDate}>
                  {format(parseISO(selected), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                  {selected === today ? ' · 오늘' : ''}
                </Text>

                {plan && recipe ? (
                  <>
                    <View style={styles.menuRow}>
                      <Text style={styles.menuName} numberOfLines={2}>
                        {recipe.name}
                      </Text>
                      <View
                        style={[styles.statusBadge, { backgroundColor: statusColor(plan.status) }]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {MEAL_STATUS_LABELS[plan.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.storageLabel}>보관</Text>
                    <Text style={styles.storageText}>{recipe.storage_method}</Text>

                    {isOpen && selected <= today && (
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() => eat(plan.id).catch(console.error)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.actionPrimary,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.actionPrimaryText}>먹음</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => skip(plan.id).catch(console.error)}
                          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        >
                          <Text style={styles.actionText}>건너뜀</Text>
                        </Pressable>
                      </View>
                    )}
                    {!isOpen && (
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() => undo(plan.id).catch(console.error)}
                          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        >
                          <Text style={styles.actionText}>되돌리기</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.sheetEmpty}>도시락이 없는 날</Text>
                )}

                <Pressable onPress={close} hitSlop={8} style={styles.sheetClose}>
                  <Text style={styles.sheetCloseText}>닫기</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  topRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  todayBtnText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 14,
  },
  sheetDate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sheetEmpty: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  menuName: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  storageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 14,
  },
  storageText: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  actionPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sheetClose: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetCloseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
