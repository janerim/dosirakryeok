import type { Ingredient, Recipe, RecipeIngredient } from '@/db/types';
import { daysStored, isStale } from './fridge';

export type RankedRecipe = {
  recipe: Recipe;
  have: string[]; // 보유 재료와 겹치는 재료
  missing: string[]; // 부족한 재료
  usesStale: boolean; // 오래된 재료를 쓰는가
};

/**
 * 레시피를 보유 재료와 겹치는 재료 수가 많은 순으로 정렬한다.
 * 겹치는 수가 같으면 부족한 재료가 적은 것, 그다음은 이름순이다.
 * 보유 재료는 소진하지 않았고 남은 양이 "없음" 이 아닌 것이며, 이름이 정확히 같아야 겹친 것으로 본다.
 */
export function rankRecipes(
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
  today: string
): RankedRecipe[] {
  const held = ingredients.filter((i) => i.is_used_up === 0 && i.amount !== 'none');
  const heldNames = new Set(held.map((i) => i.name));
  const staleNames = new Set(
    held.filter((i) => isStale(i.storage, daysStored(i.stored_date, today))).map((i) => i.name)
  );

  return recipes
    .map((recipe) => {
      const names = recipeIngredients
        .filter((ri) => ri.recipe_id === recipe.id)
        .map((ri) => ri.ingredient_name);
      const have = names.filter((n) => heldNames.has(n));
      return {
        recipe,
        have,
        missing: names.filter((n) => !heldNames.has(n)),
        usesStale: have.some((n) => staleNames.has(n)),
      };
    })
    .sort(
      (a, b) =>
        b.have.length - a.have.length ||
        a.missing.length - b.missing.length ||
        a.recipe.name.localeCompare(b.recipe.name, 'ko')
    );
}
