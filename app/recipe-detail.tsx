import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getDB } from '@/db/database';
import { getRecipe } from '@/db/recipe';
import { listRecipeIngredients } from '@/db/recipeIngredient';
import type { Recipe, RecipeIngredient } from '@/db/types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getDB();
      setRecipe(await getRecipe(db, Number(id)));
      setIngredients(await listRecipeIngredients(db, Number(id)));
    })().catch(console.error);
  }, [id]);

  if (!recipe) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.name}>{recipe.name}</Text>
        <Text style={styles.sub}>
          조리 {recipe.cook_minutes}분 · 보관 {recipe.storage_days}일
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>재료</Text>
        {ingredients.map((i) => (
          <View key={i.id} style={styles.ingredientRow}>
            <Text style={styles.body}>{i.ingredient_name}</Text>
            <Text style={styles.amount}>{i.amount}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>조리 순서</Text>
        {recipe.steps.map((step, n) => (
          <View key={n} style={styles.stepRow}>
            <Text style={styles.stepNo}>{n + 1}</Text>
            <Text style={[styles.body, { flex: 1 }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>보관 방법</Text>
        <Text style={styles.body}>{recipe.storage_method}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 24 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  body: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  amount: { fontSize: 15, color: Colors.textSecondary },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepNo: {
    width: 20,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
});
