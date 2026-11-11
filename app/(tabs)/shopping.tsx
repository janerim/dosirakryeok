import { useEffect, useState } from 'react';
import { ActionSheetIOS, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { STORAGE_LABELS, STORAGE_ORDER } from '@/constants/storage';
import { WeekNavigator } from '@/components/week/WeekNavigator';
import { defaultWeekStart } from '@/lib/week';
import { useIngredientStore } from '@/store/ingredientStore';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { useShoppingStore } from '@/store/shoppingStore';

export default function ShoppingScreen() {
  const [weekStart, setWeekStart] = useState(() => defaultWeekStart(new Date()));
  const { items, load, toggle, putAway } = useShoppingStore();
  // 계획이나 냉장고가 바뀌면 목록을 다시 계산한다
  const plans = useMealPlanStore((s) => s.plans);
  const ingredients = useIngredientStore((s) => s.items);
  const purchased = items.filter((i) => i.is_purchased === 1).length;

  useEffect(() => {
    load(weekStart).catch(console.error);
  }, [load, weekStart, plans, ingredients]);

  const onPutAway = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `구매한 ${purchased}개를 어디에 넣을까요?`,
        options: [...STORAGE_ORDER.map((s) => STORAGE_LABELS[s]), '취소'],
        cancelButtonIndex: STORAGE_ORDER.length,
      },
      (index) => {
        if (index >= STORAGE_ORDER.length) return;
        putAway(weekStart, STORAGE_ORDER[index], format(new Date(), 'yyyy-MM-dd')).catch(
          console.error
        );
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={items.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            살 것이 없습니다.{'\n'}이번 주 탭에서 메뉴를 고르면 부족한 재료가 여기에 모입니다.
          </Text>
        }
        renderItem={({ item }) => {
          const done = item.is_purchased === 1;
          return (
            <Pressable
              onPress={() => toggle(item).catch(console.error)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
            >
              <Ionicons
                name={done ? 'checkbox' : 'square-outline'}
                size={22}
                color={done ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.rowName, done && styles.rowDone]} numberOfLines={1}>
                {item.ingredient_name}
              </Text>
              <Text style={[styles.rowAmount, done && styles.rowDone]}>{item.amount}</Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={onPutAway}
        disabled={purchased === 0}
        style={({ pressed }) => [
          styles.putAwayBtn,
          (pressed || purchased === 0) && styles.putAwayBtnOff,
        ]}
      >
        <Text style={styles.putAwayBtnText}>
          냉장고에 넣기{purchased > 0 ? ` (${purchased})` : ''}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.6 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowAmount: { fontSize: 13, color: Colors.textSecondary },
  rowDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  emptyWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  putAwayBtn: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  putAwayBtnOff: { opacity: 0.4 },
  putAwayBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
