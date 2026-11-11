import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useRecipeStore } from '@/store/recipeStore';

export default function RecipesScreen() {
  const { recipes, refresh } = useRecipeStore();

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>레시피 {recipes.length}개</Text>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(it) => String(it.id)}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/recipe-detail', params: { id: String(item.id) } })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowSub}>
                조리 {item.cook_minutes}분 · 보관 {item.storage_days}일
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.6 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  chevron: { fontSize: 22, color: Colors.textSecondary },
});
