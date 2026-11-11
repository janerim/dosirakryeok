import { createRecipe, updateRecipe } from './recipe';
import { createRecipeIngredient } from './recipeIngredient';
import type { Db, RecipeInput } from './types';

/** assets/recipes.json 의 항목 하나. 형식은 README.md 에 있다. */
export type SeedRecipe = RecipeInput & {
  ingredients: { name: string; amount: string }[];
};

/**
 * 시드 레시피를 DB 에 맞춘다. 앱을 켤 때마다 부른다.
 * 이름이 같은 레시피가 있으면 내용을 덮어쓰고, 없으면 새로 넣는다.
 * 시드에서 빠진 레시피는 식단이 가리키고 있을 수 있어 지우지 않는다.
 */
export async function syncSeedRecipes(db: Db, seeds: SeedRecipe[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const { ingredients, ...recipe } of seeds) {
      const found = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM recipe WHERE name = ?',
        [recipe.name]
      );
      let id: number;
      if (found) {
        id = found.id;
        await updateRecipe(db, id, recipe);
        await db.runAsync('DELETE FROM recipe_ingredient WHERE recipe_id = ?', [id]);
      } else {
        id = await createRecipe(db, recipe);
      }
      for (const i of ingredients) {
        await createRecipeIngredient(db, {
          recipe_id: id,
          ingredient_name: i.name,
          amount: i.amount,
        });
      }
    }
  });
}
