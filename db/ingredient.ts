import type { Db, Ingredient, IngredientInput } from './types';

export async function createIngredient(db: Db, input: IngredientInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO ingredient (name, storage, stored_date, amount, is_used_up) VALUES (?, ?, ?, ?, ?)',
    [input.name, input.storage, input.stored_date, input.amount, input.is_used_up]
  );
  return r.lastInsertRowId;
}

export function getIngredient(db: Db, id: number): Promise<Ingredient | null> {
  return db.getFirstAsync<Ingredient>('SELECT * FROM ingredient WHERE id = ?', [id]);
}

/** 넣은 지 오래된 것부터 */
export function listIngredients(db: Db): Promise<Ingredient[]> {
  return db.getAllAsync<Ingredient>('SELECT * FROM ingredient ORDER BY stored_date, id', []);
}

export async function updateIngredient(db: Db, id: number, input: IngredientInput): Promise<void> {
  await db.runAsync(
    'UPDATE ingredient SET name = ?, storage = ?, stored_date = ?, amount = ?, is_used_up = ? WHERE id = ?',
    [input.name, input.storage, input.stored_date, input.amount, input.is_used_up, id]
  );
}

export async function deleteIngredient(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM ingredient WHERE id = ?', [id]);
}
