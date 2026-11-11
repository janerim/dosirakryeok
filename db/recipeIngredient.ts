import type { Db, RecipeIngredient, RecipeIngredientInput } from './types';

export async function createRecipeIngredient(db: Db, input: RecipeIngredientInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO recipe_ingredient (recipe_id, ingredient_name, amount) VALUES (?, ?, ?)',
    [input.recipe_id, input.ingredient_name, input.amount]
  );
  return r.lastInsertRowId;
}

export function getRecipeIngredient(db: Db, id: number): Promise<RecipeIngredient | null> {
  return db.getFirstAsync<RecipeIngredient>('SELECT * FROM recipe_ingredient WHERE id = ?', [id]);
}

export function listRecipeIngredients(db: Db, recipeId: number): Promise<RecipeIngredient[]> {
  return db.getAllAsync<RecipeIngredient>(
    'SELECT * FROM recipe_ingredient WHERE recipe_id = ? ORDER BY id',
    [recipeId]
  );
}

export async function updateRecipeIngredient(db: Db, id: number, input: RecipeIngredientInput): Promise<void> {
  await db.runAsync(
    'UPDATE recipe_ingredient SET recipe_id = ?, ingredient_name = ?, amount = ? WHERE id = ?',
    [input.recipe_id, input.ingredient_name, input.amount, id]
  );
}

export async function deleteRecipeIngredient(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recipe_ingredient WHERE id = ?', [id]);
}
