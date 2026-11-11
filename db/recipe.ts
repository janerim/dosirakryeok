import type { Db, Recipe, RecipeInput } from './types';

type Row = Omit<Recipe, 'steps'> & { steps: string };

const toRecipe = (r: Row): Recipe => ({ ...r, steps: JSON.parse(r.steps) });

export async function createRecipe(db: Db, input: RecipeInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO recipe (name, cook_minutes, steps, storage_method, storage_days) VALUES (?, ?, ?, ?, ?)',
    [input.name, input.cook_minutes, JSON.stringify(input.steps), input.storage_method, input.storage_days]
  );
  return r.lastInsertRowId;
}

export async function getRecipe(db: Db, id: number): Promise<Recipe | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM recipe WHERE id = ?', [id]);
  return row ? toRecipe(row) : null;
}

export async function listRecipes(db: Db): Promise<Recipe[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM recipe ORDER BY name, id', []);
  return rows.map(toRecipe);
}

export async function updateRecipe(db: Db, id: number, input: RecipeInput): Promise<void> {
  await db.runAsync(
    'UPDATE recipe SET name = ?, cook_minutes = ?, steps = ?, storage_method = ?, storage_days = ? WHERE id = ?',
    [input.name, input.cook_minutes, JSON.stringify(input.steps), input.storage_method, input.storage_days, id]
  );
}

/** 재료(recipe_ingredient)는 함께 지워진다. 식단(meal_plan)에 쓰인 레시피는 지울 수 없다. */
export async function deleteRecipe(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recipe WHERE id = ?', [id]);
}
