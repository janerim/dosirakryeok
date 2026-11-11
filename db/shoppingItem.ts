import type { Db, ShoppingItem, ShoppingItemInput } from './types';

export async function createShoppingItem(db: Db, input: ShoppingItemInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO shopping_item (week, ingredient_name, amount, is_purchased) VALUES (?, ?, ?, ?)',
    [input.week, input.ingredient_name, input.amount, input.is_purchased]
  );
  return r.lastInsertRowId;
}

export function getShoppingItem(db: Db, id: number): Promise<ShoppingItem | null> {
  return db.getFirstAsync<ShoppingItem>('SELECT * FROM shopping_item WHERE id = ?', [id]);
}

/** week 는 그 주 월요일(yyyy-MM-dd) */
export function listShoppingItems(db: Db, week: string): Promise<ShoppingItem[]> {
  return db.getAllAsync<ShoppingItem>(
    'SELECT * FROM shopping_item WHERE week = ? ORDER BY id',
    [week]
  );
}

export async function updateShoppingItem(db: Db, id: number, input: ShoppingItemInput): Promise<void> {
  await db.runAsync(
    'UPDATE shopping_item SET week = ?, ingredient_name = ?, amount = ?, is_purchased = ? WHERE id = ?',
    [input.week, input.ingredient_name, input.amount, input.is_purchased, id]
  );
}

export async function deleteShoppingItem(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM shopping_item WHERE id = ?', [id]);
}
