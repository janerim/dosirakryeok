import { useEffect, useMemo } from 'react';
import {
  ActionSheetIOS,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { AMOUNT_LABELS, STORAGE_LABELS } from '@/constants/storage';
import { groupByStorage, type FridgeItem } from '@/lib/fridge';
import { useIngredientStore } from '@/store/ingredientStore';
import type { Amount, Ingredient } from '@/db/types';

const AMOUNTS: Amount[] = ['plenty', 'little', 'none'];

export default function FridgeScreen() {
  const { items, frequent, refresh, add, edit } = useIngredientStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const sections = useMemo(() => groupByStorage(items, today), [items, today]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const onLongPress = ({ id, days, stale, ...input }: FridgeItem) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: input.name,
        options: [...AMOUNTS.map((a) => AMOUNT_LABELS[a]), '다 썼어요', '취소'],
        destructiveButtonIndex: AMOUNTS.length,
        cancelButtonIndex: AMOUNTS.length + 1,
      },
      (index) => {
        if (index < AMOUNTS.length) {
          edit(id, { ...input, amount: AMOUNTS[index] }).catch(console.error);
        } else if (index === AMOUNTS.length) {
          edit(id, { ...input, is_used_up: 1 }).catch(console.error);
        }
      }
    );
  };

  const onPressChip = ({ name, storage }: Pick<Ingredient, 'name' | 'storage'>) => {
    add({ name, storage, stored_date: today, amount: 'plenty', is_used_up: 0 }).catch(
      console.error
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>냉장고</Text>
        <Pressable
          onPress={() => router.push('/ingredient-form')}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="재료 추가"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {frequent.length > 0 && (
        <View style={styles.chipBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {frequent.map((f) => (
              <Pressable
                key={f.name}
                onPress={() => onPressChip(f)}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${f.name} 추가`}
              >
                <Text style={styles.chipText}>＋ {f.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(it) => String(it.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 && styles.emptyWrap}
        ListEmptyComponent={<Text style={styles.emptyText}>재료를 추가해 보세요</Text>}
        ListFooterComponent={
          sections.length > 0 ? (
            <Text style={styles.hint}>길게 누르면 남은 양을 바꾸거나 다 쓴 것으로 표시합니다</Text>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>
            {STORAGE_LABELS[section.storage]} {section.data.length}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => onLongPress(item)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowAmount}>{AMOUNT_LABELS[item.amount]}</Text>
            <View style={[styles.daysBadge, item.stale && styles.daysBadgeStale]}>
              <Text style={[styles.daysText, item.stale && styles.daysTextStale]}>
                {item.days}일째
              </Text>
            </View>
          </Pressable>
        )}
      />
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
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  chipBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowAmount: { fontSize: 13, color: Colors.textSecondary },
  daysBadge: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  daysBadgeStale: { backgroundColor: Colors.accent },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  daysTextStale: { color: '#fff', fontWeight: '700' },
  emptyWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
