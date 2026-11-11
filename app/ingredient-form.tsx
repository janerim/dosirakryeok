import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { STORAGE_LABELS, STORAGE_ORDER } from '@/constants/storage';
import { useIngredientStore } from '@/store/ingredientStore';
import type { Storage } from '@/db/types';

export default function IngredientFormScreen() {
  const add = useIngredientStore((s) => s.add);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [name, setName] = useState('');
  const [storage, setStorage] = useState<Storage>('fridge');
  const [storedDate, setStoredDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const shiftDate = (delta: number) =>
    setStoredDate((d) => format(addDays(parseISO(d), delta), 'yyyy-MM-dd'));

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      await add({
        name: name.trim(),
        storage,
        stored_date: storedDate,
        amount: 'plenty',
        is_used_up: 0,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? String(e));
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>이름</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="재료 이름"
          placeholderTextColor={Colors.textSecondary}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>보관 위치</Text>
        <View style={styles.segment}>
          {STORAGE_ORDER.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStorage(s)}
              style={[styles.segmentItem, storage === s && styles.segmentItemOn]}
            >
              <Text style={[styles.segmentText, storage === s && styles.segmentTextOn]}>
                {STORAGE_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>넣은 날짜</Text>
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => shiftDate(-1)}
            hitSlop={8}
            style={styles.dateArrow}
            accessibilityRole="button"
            accessibilityLabel="하루 전"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.dateText}>
            {format(parseISO(storedDate), 'M월 d일 (EEE)', { locale: ko })}
            {storedDate === today ? ' · 오늘' : ''}
          </Text>
          <Pressable
            onPress={() => shiftDate(1)}
            disabled={storedDate >= today}
            hitSlop={8}
            style={[styles.dateArrow, storedDate >= today && styles.dimmed]}
            accessibilityRole="button"
            accessibilityLabel="하루 뒤"
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.primaryBtn, saving && styles.dimmed]}
        disabled={saving}
        onPress={onSave}
      >
        <Text style={styles.primaryBtnText}>저장하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  segmentItemOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  segmentTextOn: { color: '#fff' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dateArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 15, color: Colors.textPrimary },
  dimmed: { opacity: 0.4 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
