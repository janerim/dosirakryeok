import { computeShoppingNeeds } from '@/lib/shopping';
import { createIngredient, listIngredients } from './ingredient';
import { listMealPlans } from './mealPlan';
import { listAllRecipeIngredients } from './recipeIngredient';
import type { Db, ShoppingItem, ShoppingItemInput, Storage } from './types';

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

/**
 * 그 주의 계획과 냉장고를 보고 장보기 목록을 다시 계산한다. week 는 월요일, to 는 금요일.
 * 이미 있는 항목은 구매 여부를 그대로 두고 양만 고친다.
 * 필요 없어진 항목은 지우되, 이미 구매한 것은 남긴다.
 */
export async function refreshShoppingList(db: Db, week: string, to: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const needs = computeShoppingNeeds(
      await listMealPlans(db, week, to),
      await listAllRecipeIngredients(db),
      await listIngredients(db)
    );
    const existing = await listShoppingItems(db, week);
    for (const need of needs) {
      const found = existing.find((e) => e.ingredient_name === need.name);
      if (!found) {
        await createShoppingItem(db, {
          week,
          ingredient_name: need.name,
          amount: need.amount,
          is_purchased: 0,
        });
      } else if (found.amount !== need.amount) {
        await updateShoppingItem(db, found.id, { ...found, amount: need.amount });
      }
    }
    for (const e of existing) {
      if (e.is_purchased === 0 && !needs.some((n) => n.name === e.ingredient_name)) {
        await deleteShoppingItem(db, e.id);
      }
    }
  });
}

/** 그 주의 구매한 항목을 냉장고에 재료로 등록하고 장보기 목록에서 뺀다 */
export async function storePurchasedItems(
  db: Db,
  week: string,
  storage: Storage,
  today: string
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const item of await listShoppingItems(db, week)) {
      if (item.is_purchased === 0) continue;
      await createIngredient(db, {
        name: item.ingredient_name,
        storage,
        stored_date: today,
        amount: 'plenty',
        is_used_up: 0,
      });
      await deleteShoppingItem(db, item.id);
    }
  });
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
