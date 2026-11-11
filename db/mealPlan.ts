import type { Db, MealPlan, MealPlanInput, MealStatus } from './types';

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

/**
 * 여러 날짜에 같은 레시피를 "계획" 상태로 배치한다.
 * 그 날짜에 이미 식단이 있으면 레시피를 바꾸고 상태를 "계획" 으로 되돌린다.
 * 먹음 처리했던 날이면 줄였던 재료도 되돌린다.
 */
export async function planMeals(db: Db, dates: string[], recipeId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const date of dates) {
      const found = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM meal_plan WHERE date = ? ORDER BY id LIMIT 1',
        [date]
      );
      const input: MealPlanInput = { date, recipe_id: recipeId, status: 'planned' };
      if (found) {
        await undo(db, found.id);
        await updateMealPlan(db, found.id, input);
      } else {
        await createMealPlan(db, input);
      }
    }
  });
}

/** 기간 안의 "계획" 을 모두 "준비됨" 으로 바꾼다 */
export async function prepareMeals(db: Db, from: string, to: string): Promise<void> {
  await db.runAsync(
    "UPDATE meal_plan SET status = 'prepared' WHERE date BETWEEN ? AND ? AND status = 'planned'",
    [from, to]
  );
}

/**
 * "먹음" 으로 바꾸고 그 레시피의 재료를 한 단계씩 줄인다 (넉넉 → 조금 → 없음).
 * 재료는 이름이 같은 보유 재료 중 가장 오래된 것 하나를 줄이고, 없으면 건너뛴다.
 * 무엇을 줄였는지 meal_consumption 에 적어 두어 되돌릴 수 있게 한다.
 * 이미 먹음·건너뜀인 식단에는 아무것도 하지 않는다.
 */
export async function markEaten(db: Db, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    const plan = await getMealPlan(db, id);
    if (!plan || !isOpen(plan.status)) return;
    const needs = await db.getAllAsync<{ ingredient_name: string }>(
      'SELECT ingredient_name FROM recipe_ingredient WHERE recipe_id = ? ORDER BY id',
      [plan.recipe_id]
    );
    for (const { ingredient_name } of needs) {
      const held = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM ingredient
          WHERE name = ? AND is_used_up = 0 AND amount != 'none'
          ORDER BY stored_date, id LIMIT 1`,
        [ingredient_name]
      );
      if (!held) continue;
      await db.runAsync(
        "UPDATE ingredient SET amount = CASE amount WHEN 'plenty' THEN 'little' ELSE 'none' END WHERE id = ?",
        [held.id]
      );
      await db.runAsync(
        'INSERT INTO meal_consumption (meal_plan_id, ingredient_id) VALUES (?, ?)',
        [id, held.id]
      );
    }
    await close(db, plan, 'eaten');
  });
}

/** "건너뜀" 으로 바꾼다. 재료는 그대로 둔다. 이미 먹음·건너뜀인 식단에는 아무것도 하지 않는다. */
export async function markSkipped(db: Db, id: number): Promise<void> {
  const plan = await getMealPlan(db, id);
  if (plan && isOpen(plan.status)) await close(db, plan, 'skipped');
}

/** 먹음·건너뜀을 그 전 상태로 되돌린다. 먹음이었으면 줄였던 재료를 한 단계씩 다시 올린다. */
export async function undoMeal(db: Db, id: number): Promise<void> {
  await db.withTransactionAsync(() => undo(db, id));
}

const isOpen = (status: MealStatus) => status === 'planned' || status === 'prepared';

async function close(db: Db, plan: MealPlan, status: 'eaten' | 'skipped'): Promise<void> {
  await db.runAsync('UPDATE meal_plan SET status = ?, prev_status = ? WHERE id = ?', [
    status,
    plan.status,
    plan.id,
  ]);
}

/** 트랜잭션 안에서 부른다 */
async function undo(db: Db, id: number): Promise<void> {
  const plan = await getMealPlan(db, id);
  if (!plan || isOpen(plan.status)) return;
  await db.runAsync(
    `UPDATE ingredient SET amount = CASE amount WHEN 'none' THEN 'little' ELSE 'plenty' END
      WHERE id IN (SELECT ingredient_id FROM meal_consumption WHERE meal_plan_id = ?)`,
    [id]
  );
  await db.runAsync('DELETE FROM meal_consumption WHERE meal_plan_id = ?', [id]);
  await db.runAsync('UPDATE meal_plan SET status = ?, prev_status = NULL WHERE id = ?', [
    plan.prev_status ?? 'planned',
    id,
  ]);
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
