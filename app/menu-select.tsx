import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getDB } from '@/db/database';
import { listAllRecipeIngredients } from '@/db/recipeIngredient';
import { rankRecipes } from '@/lib/menu';
import { mondayOf, weekdaysOf } from '@/lib/week';
import { useIngredientStore } from '@/store/ingredientStore';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { useRecipeStore } from '@/store/recipeStore';
import type { RecipeIngredient } from '@/db/types';

export default function MenuSelectScreen() {
  // date: 누른 칸의 날짜. 같은 주의 월~금을 함께 고를 수 있다
  const { date } = useLocalSearchParams<{ date: string }>();
  const days = weekdaysOf(mondayOf(parseISO(date)));
  const [selected, setSelected] = useState<string[]>([date]);

  const recipes = useRecipeStore((s) => s.recipes);
  const { items, refresh } = useIngredientStore();
  const assign = useMealPlanStore((s) => s.assign);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  useEffect(() => {
    refresh().catch(console.error);
    getDB().then(listAllRecipeIngredients).then(setRecipeIngredients).catch(console.error);
  }, [refresh]);

  const ranked = useMemo(
    () => rankRecipes(recipes, recipeIngredients, items, format(new Date(), 'yyyy-MM-dd')),
    [recipes, recipeIngredients, items]
  );

  const toggle = (d: string) =>
    setSelected((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));

  const onPick = async (recipeId: number) => {
    if (selected.length === 0) return;
    await assign(selected, recipeId);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.dayBar}>
        <Text style={styles.dayBarLabel}>넣을 요일</Text>
        <View style={styles.days}>
          {days.map((d) => {
            const on = selected.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggle(d)}
                style={[styles.day, on && styles.dayOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.dayText, on && styles.dayTextOn]}>
                  {format(parseISO(d), 'EEE', { locale: ko })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={ranked}
        keyExtractor={(it) => String(it.recipe.id)}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item.recipe.id).catch(console.error)}
            disabled={selected.length === 0}
            style={({ pressed }) => [
              styles.row,
              (pressed || selected.length === 0) && styles.pressed,
            ]}
          >
            <View style={styles.rowHead}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.recipe.name}
              </Text>
              {item.usesStale && (
                <View style={styles.staleBadge}>
                  <Text style={styles.staleBadgeText}>오래된 재료</Text>
                </View>
              )}
              <Text style={styles.rowCount}>
                {item.have.length} / {item.have.length + item.missing.length}
              </Text>
            </View>
            {item.have.length > 0 && (
              <Text style={styles.have}>있음 · {item.have.join(', ')}</Text>
            )}
            {item.missing.length > 0 && (
              <Text style={styles.missing}>부족 · {item.missing.join(', ')}</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  dayBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dayBarLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  days: { flexDirection: 'row', gap: 8 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  dayTextOn: { color: '#fff' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  row: { paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  pressed: { opacity: 0.5 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowCount: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  staleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  staleBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  have: { fontSize: 13, color: Colors.primary },
  missing: { fontSize: 13, color: Colors.textSecondary },
});
