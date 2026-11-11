import type { Ingredient, MealPlan, RecipeIngredient } from '@/db/types';

export type ShoppingNeed = { name: string; amount: string };

/**
 * "계획" 상태인 식단에 필요한 재료 중 보유하지 않은 것을 모은다.
 * 보유는 소진하지 않았고 남은 양이 "없음" 이 아닌 것이며, 이름이 정확히 같아야 한다.
 * 같은 재료는 하나로 합치고 양은 "2개 ×2 + 1개" 처럼 이어 붙인다. 순서는 먼저 필요한 날짜순이다.
 */
export function computeShoppingNeeds(
  plans: MealPlan[],
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[]
): ShoppingNeed[] {
  const held = new Set(
    ingredients.filter((i) => i.is_used_up === 0 && i.amount !== 'none').map((i) => i.name)
  );

  // 재료 이름 → (양 → 횟수)
  const needs = new Map<string, Map<string, number>>();
  const planned = plans
    .filter((p) => p.status === 'planned')
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  for (const plan of planned) {
    for (const ri of recipeIngredients) {
      if (ri.recipe_id !== plan.recipe_id || held.has(ri.ingredient_name)) continue;
      const amounts = needs.get(ri.ingredient_name) ?? new Map<string, number>();
      amounts.set(ri.amount, (amounts.get(ri.amount) ?? 0) + 1);
      needs.set(ri.ingredient_name, amounts);
    }
  }

  return [...needs].map(([name, amounts]) => ({
    name,
    amount: [...amounts].map(([a, n]) => (n > 1 ? `${a} ×${n}` : a)).join(' + '),
  }));
}
