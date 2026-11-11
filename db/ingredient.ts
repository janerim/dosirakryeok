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

/** 많이 등록한 이름부터. 보관 위치는 그 이름으로 마지막에 등록한 것을 따른다. 소진한 것도 센다. */
export function listFrequentIngredients(
  db: Db,
  limit: number
): Promise<Pick<Ingredient, 'name' | 'storage'>[]> {
  return db.getAllAsync(
    `SELECT name,
            (SELECT storage FROM ingredient b WHERE b.name = a.name ORDER BY b.id DESC LIMIT 1) AS storage
       FROM ingredient a
      GROUP BY name
      ORDER BY COUNT(*) DESC, MAX(id) DESC
      LIMIT ?`,
    [limit]
  );
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
