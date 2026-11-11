import type { Db, MealPlan, MealPlanInput } from './types';

export async function createMealPlan(db: Db, input: MealPlanInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO meal_plan (date, recipe_id, status) VALUES (?, ?, ?)',
    [input.date, input.recipe_id, input.status]
  );
  return r.lastInsertRowId;
}

export function getMealPlan(db: Db, id: number): Promise<MealPlan | null> {
  return db.getFirstAsync<MealPlan>('SELECT * FROM meal_plan WHERE id = ?', [id]);
}

/** from 과 to 는 yyyy-MM-dd, 둘 다 포함한다 */
export function listMealPlans(db: Db, from: string, to: string): Promise<MealPlan[]> {
  return db.getAllAsync<MealPlan>(
    'SELECT * FROM meal_plan WHERE date BETWEEN ? AND ? ORDER BY date, id',
    [from, to]
  );
}

export async function updateMealPlan(db: Db, id: number, input: MealPlanInput): Promise<void> {
  await db.runAsync(
    'UPDATE meal_plan SET date = ?, recipe_id = ?, status = ? WHERE id = ?',
    [input.date, input.recipe_id, input.status, id]
  );
}

export async function deleteMealPlan(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM meal_plan WHERE id = ?', [id]);
}
