import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, migrate } from './migrations';
import { getSetting, setSetting } from './setting';
import { openTestDb } from './testDb';
import type { Db, IngredientInput, RecipeInput } from './types';
import {
  createIngredient,
  deleteIngredient,
  getIngredient,
  listFrequentIngredients,
  listIngredients,
  updateIngredient,
} from './ingredient';
import { createRecipe, deleteRecipe, getRecipe, listRecipes, updateRecipe } from './recipe';
import {
  createRecipeIngredient,
  deleteRecipeIngredient,
  getRecipeIngredient,
  listRecipeIngredients,
  updateRecipeIngredient,
} from './recipeIngredient';
import {
  createMealPlan,
  deleteMealPlan,
  getMealPlan,
  listMealPlans,
  markEaten,
  markSkipped,
  planMeals,
  prepareMeals,
  undoMeal,
  updateMealPlan,
} from './mealPlan';
import {
  createShoppingItem,
  deleteShoppingItem,
  getShoppingItem,
  listShoppingItems,
  refreshShoppingList,
  storePurchasedItems,
  updateShoppingItem,
} from './shoppingItem';

const egg: IngredientInput = {
  name: '달걀',
  storage: 'fridge',
  stored_date: '2026-11-08',
  amount: 'plenty',
  is_used_up: 0,
};

const friedRice: RecipeInput = {
  name: '달걀볶음밥',
  cook_minutes: 15,
  steps: ['밥을 볶는다', '달걀을 넣는다'],
  storage_method: '냉장',
  storage_days: 3,
};

const version = async (db: Db) =>
  (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version;

let db: Db;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

describe('migrate', () => {
  it('새 DB 를 최신 버전으로 올린다', async () => {
    expect(await version(db)).toBe(MIGRATIONS.length);
  });

  it('다시 실행해도 아무것도 하지 않는다', async () => {
    await createIngredient(db, egg);
    await migrate(db);
    expect(await version(db)).toBe(MIGRATIONS.length);
    expect(await listIngredients(db)).toHaveLength(1);
  });

  it('뒤에 추가한 마이그레이션만 적용한다', async () => {
    const id = await createIngredient(db, egg);
    MIGRATIONS.push(async (d) => {
      await d.execAsync('ALTER TABLE ingredient ADD COLUMN memo TEXT');
    });
    try {
      await migrate(db);
      expect(await version(db)).toBe(MIGRATIONS.length);
      expect(await getIngredient(db, id)).toEqual({ id, ...egg, memo: null });
    } finally {
      MIGRATIONS.pop();
    }
  });

  it('실패한 마이그레이션은 되돌리고 버전을 올리지 않는다', async () => {
    const before = MIGRATIONS.length;
    MIGRATIONS.push(async (d) => {
      await d.execAsync('ALTER TABLE ingredient ADD COLUMN memo TEXT');
      await d.execAsync('SELECT * FROM no_such_table');
    });
    try {
      await expect(migrate(db)).rejects.toThrow();
      expect(await version(db)).toBe(before);
      const id = await createIngredient(db, egg);
      expect(await getIngredient(db, id)).toEqual({ id, ...egg });
    } finally {
      MIGRATIONS.pop();
    }
  });

  it('파일 DB 는 닫았다 다시 열어도 데이터가 남는다', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dosirak-'));
    try {
      const path = join(dir, 'test.db');
      const first = openTestDb(path);
      await migrate(first);
      const id = await createIngredient(first, egg);
      first.close();

      const second = openTestDb(path);
      await migrate(second);
      expect(await version(second)).toBe(MIGRATIONS.length);
      expect(await getIngredient(second, id)).toEqual({ id, ...egg });
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('setting', () => {
  it('없으면 null, 저장하면 읽히고, 다시 저장하면 덮어쓴다', async () => {
    expect(await getSetting(db, 'reminders')).toBeNull();
    await setSetting(db, 'reminders', '{"a":1}');
    await setSetting(db, 'reminders', '{"a":2}');
    expect(await getSetting(db, 'reminders')).toBe('{"a":2}');
  });
});

describe('ingredient', () => {
  it('생성, 조회, 수정, 삭제', async () => {
    const id = await createIngredient(db, egg);
    expect(await getIngredient(db, id)).toEqual({ id, ...egg });

    const used: IngredientInput = { ...egg, storage: 'freezer', amount: 'none', is_used_up: 1 };
    await updateIngredient(db, id, used);
    expect(await getIngredient(db, id)).toEqual({ id, ...used });

    await deleteIngredient(db, id);
    expect(await getIngredient(db, id)).toBeNull();
  });

  it('목록은 넣은 지 오래된 것부터', async () => {
    await createIngredient(db, { ...egg, name: '두부', stored_date: '2026-11-10' });
    await createIngredient(db, egg);
    expect((await listIngredients(db)).map((i) => i.name)).toEqual(['달걀', '두부']);
  });

  it('자주 등록한 재료는 많이 등록한 순, 보관 위치는 마지막 것', async () => {
    await createIngredient(db, { ...egg, name: '두부' });
    await createIngredient(db, egg);
    await createIngredient(db, { ...egg, storage: 'freezer', is_used_up: 1 });
    await createIngredient(db, { ...egg, name: '대파' });
    expect(await listFrequentIngredients(db, 2)).toEqual([
      { name: '달걀', storage: 'freezer' },
      { name: '대파', storage: 'fridge' },
    ]);
  });

  it('정해지지 않은 보관 위치와 남은 양은 거부한다', async () => {
    await expect(createIngredient(db, { ...egg, storage: 'shelf' as never })).rejects.toThrow();
    await expect(createIngredient(db, { ...egg, amount: 'lots' as never })).rejects.toThrow();
  });
});

describe('recipe', () => {
  it('생성, 조회, 수정, 삭제', async () => {
    const id = await createRecipe(db, friedRice);
    expect(await getRecipe(db, id)).toEqual({ id, ...friedRice });
    expect(await listRecipes(db)).toEqual([{ id, ...friedRice }]);

    const changed: RecipeInput = { ...friedRice, steps: ['한 번에 볶는다'], storage_days: 2 };
    await updateRecipe(db, id, changed);
    expect(await getRecipe(db, id)).toEqual({ id, ...changed });

    await deleteRecipe(db, id);
    expect(await getRecipe(db, id)).toBeNull();
  });

  it('지우면 딸린 재료도 지워진다', async () => {
    const id = await createRecipe(db, friedRice);
    await createRecipeIngredient(db, { recipe_id: id, ingredient_name: '달걀', amount: '2개' });
    await deleteRecipe(db, id);
    expect(await listRecipeIngredients(db, id)).toEqual([]);
  });

  it('식단에 쓰인 레시피는 지울 수 없다', async () => {
    const id = await createRecipe(db, friedRice);
    await createMealPlan(db, { date: '2026-11-09', recipe_id: id, status: 'planned' });
    await expect(deleteRecipe(db, id)).rejects.toThrow();
  });
});

describe('recipe_ingredient', () => {
  it('생성, 조회, 수정, 삭제', async () => {
    const recipeId = await createRecipe(db, friedRice);
    const input = { recipe_id: recipeId, ingredient_name: '달걀', amount: '2개' };
    const id = await createRecipeIngredient(db, input);
    expect(await getRecipeIngredient(db, id)).toEqual({ id, ...input });
    expect(await listRecipeIngredients(db, recipeId)).toEqual([{ id, ...input }]);

    await updateRecipeIngredient(db, id, { ...input, amount: '3개' });
    expect((await getRecipeIngredient(db, id))?.amount).toBe('3개');

    await deleteRecipeIngredient(db, id);
    expect(await getRecipeIngredient(db, id)).toBeNull();
  });

  it('없는 레시피에는 붙일 수 없다', async () => {
    await expect(
      createRecipeIngredient(db, { recipe_id: 999, ingredient_name: '달걀', amount: '2개' })
    ).rejects.toThrow();
  });
});

describe('meal_plan', () => {
  it('생성, 조회, 수정, 삭제', async () => {
    const recipeId = await createRecipe(db, friedRice);
    const input = { date: '2026-11-09', recipe_id: recipeId, status: 'planned' as const };
    const id = await createMealPlan(db, input);
    expect(await getMealPlan(db, id)).toEqual({ id, ...input, prev_status: null });

    for (const status of ['prepared', 'eaten', 'skipped'] as const) {
      await updateMealPlan(db, id, { ...input, status });
      expect((await getMealPlan(db, id))?.status).toBe(status);
    }

    await deleteMealPlan(db, id);
    expect(await getMealPlan(db, id)).toBeNull();
  });

  it('목록은 기간 안의 것만 날짜순으로', async () => {
    const recipeId = await createRecipe(db, friedRice);
    for (const date of ['2026-11-13', '2026-11-09', '2026-11-16']) {
      await createMealPlan(db, { date, recipe_id: recipeId, status: 'planned' });
    }
    const dates = (await listMealPlans(db, '2026-11-09', '2026-11-13')).map((m) => m.date);
    expect(dates).toEqual(['2026-11-09', '2026-11-13']);
  });

  it('평일 5칸에 배치하면 계획 상태로 저장된다', async () => {
    const recipeId = await createRecipe(db, friedRice);
    const week = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
    await planMeals(db, week, recipeId);
    const plans = await listMealPlans(db, week[0], week[4]);
    expect(plans.map((p) => p.date)).toEqual(week);
    expect(plans.every((p) => p.recipe_id === recipeId && p.status === 'planned')).toBe(true);
  });

  it('이미 식단이 있는 날은 늘리지 않고 레시피를 바꾸며 계획으로 되돌린다', async () => {
    const riceId = await createRecipe(db, friedRice);
    const tofuId = await createRecipe(db, { ...friedRice, name: '두부조림' });
    const id = await createMealPlan(db, { date: '2026-11-09', recipe_id: riceId, status: 'eaten' });
    await planMeals(db, ['2026-11-09', '2026-11-10'], tofuId);
    expect(await listMealPlans(db, '2026-11-09', '2026-11-10')).toEqual([
      { id, date: '2026-11-09', recipe_id: tofuId, status: 'planned', prev_status: null },
      { id: id + 1, date: '2026-11-10', recipe_id: tofuId, status: 'planned', prev_status: null },
    ]);
  });

  it('준비 완료는 기간 안의 계획만 준비됨으로 바꾼다', async () => {
    const recipeId = await createRecipe(db, friedRice);
    const planned = await createMealPlan(db, { date: '2026-11-09', recipe_id: recipeId, status: 'planned' });
    const skipped = await createMealPlan(db, { date: '2026-11-10', recipe_id: recipeId, status: 'skipped' });
    const nextWeek = await createMealPlan(db, { date: '2026-11-16', recipe_id: recipeId, status: 'planned' });
    await prepareMeals(db, '2026-11-09', '2026-11-13');
    expect((await getMealPlan(db, planned))?.status).toBe('prepared');
    expect((await getMealPlan(db, skipped))?.status).toBe('skipped');
    expect((await getMealPlan(db, nextWeek))?.status).toBe('planned');
  });
});

describe('먹음 처리와 되돌리기', () => {
  const amounts = async () =>
    Object.fromEntries((await listIngredients(db)).map((i) => [`${i.name}#${i.id}`, i.amount]));

  let planId: number;
  beforeEach(async () => {
    const recipeId = await createRecipe(db, friedRice);
    for (const name of ['밥', '달걀', '대파']) {
      await createRecipeIngredient(db, { recipe_id: recipeId, ingredient_name: name, amount: '1' });
    }
    await createIngredient(db, { ...egg, stored_date: '2026-11-10' }); // 달걀#1 (새것)
    await createIngredient(db, { ...egg, stored_date: '2026-11-01', amount: 'little' }); // 달걀#2 (오래된 것)
    await createIngredient(db, { ...egg, name: '대파' }); // 대파#3
    await createIngredient(db, { ...egg, name: '두부' }); // 두부#4 (레시피에 없음)
    planId = await createMealPlan(db, { date: '2026-11-11', recipe_id: recipeId, status: 'planned' });
    await prepareMeals(db, '2026-11-11', '2026-11-11');
  });

  it('계획 → 준비됨 → 먹음, 재료는 가장 오래된 것부터 한 단계씩 줄어든다', async () => {
    await markEaten(db, planId);
    expect(await getMealPlan(db, planId)).toMatchObject({ status: 'eaten', prev_status: 'prepared' });
    expect(await amounts()).toEqual({
      '달걀#1': 'plenty',
      '달걀#2': 'none',
      '대파#3': 'little',
      '두부#4': 'plenty',
    });
  });

  it('되돌리면 상태와 재료가 먹기 전으로 돌아간다', async () => {
    const before = await amounts();
    await markEaten(db, planId);
    await undoMeal(db, planId);
    expect(await getMealPlan(db, planId)).toMatchObject({ status: 'prepared', prev_status: null });
    expect(await amounts()).toEqual(before);
  });

  it('두 번 먹음 처리해도 한 번만 줄어든다', async () => {
    await markEaten(db, planId);
    await markEaten(db, planId);
    expect((await amounts())['대파#3']).toBe('little');
  });

  it('소진했거나 남은 양이 없는 재료는 건드리지 않는다', async () => {
    await updateIngredient(db, 3, { ...egg, name: '대파', amount: 'none' });
    await updateIngredient(db, 2, { ...egg, amount: 'little', is_used_up: 1 });
    await markEaten(db, planId);
    expect(await amounts()).toMatchObject({ '달걀#1': 'little', '달걀#2': 'little', '대파#3': 'none' });
    await undoMeal(db, planId);
    expect(await amounts()).toMatchObject({ '달걀#1': 'plenty', '달걀#2': 'little', '대파#3': 'none' });
  });

  it('건너뜀은 재료를 줄이지 않고, 되돌릴 수 있다', async () => {
    const before = await amounts();
    await markSkipped(db, planId);
    expect((await getMealPlan(db, planId))?.status).toBe('skipped');
    expect(await amounts()).toEqual(before);
    await undoMeal(db, planId);
    expect((await getMealPlan(db, planId))?.status).toBe('prepared');
  });

  it('먹은 날에 다른 메뉴를 넣으면 줄였던 재료가 돌아온다', async () => {
    const before = await amounts();
    const otherId = await createRecipe(db, { ...friedRice, name: '두부조림' });
    await markEaten(db, planId);
    await planMeals(db, ['2026-11-11'], otherId);
    expect(await getMealPlan(db, planId)).toMatchObject({ recipe_id: otherId, status: 'planned' });
    expect(await amounts()).toEqual(before);
  });

  it('정해지지 않은 상태는 거부한다', async () => {
    const recipeId = await createRecipe(db, friedRice);
    await expect(
      createMealPlan(db, { date: '2026-11-09', recipe_id: recipeId, status: 'done' as never })
    ).rejects.toThrow();
  });
});

describe('shopping_item', () => {
  it('생성, 조회, 수정, 삭제', async () => {
    const input = { week: '2026-11-09', ingredient_name: '대파', amount: '1단', is_purchased: 0 };
    const id = await createShoppingItem(db, input);
    expect(await getShoppingItem(db, id)).toEqual({ id, ...input });

    await updateShoppingItem(db, id, { ...input, is_purchased: 1 });
    expect((await getShoppingItem(db, id))?.is_purchased).toBe(1);

    await deleteShoppingItem(db, id);
    expect(await getShoppingItem(db, id)).toBeNull();
  });

  describe('계획 → 장보기 → 냉장고', () => {
    const WEEK = '2026-11-16';
    const FRI = '2026-11-20';
    const list = async () =>
      (await listShoppingItems(db, WEEK)).map((s) => [s.ingredient_name, s.amount, s.is_purchased]);

    let riceId: number;
    let tofuId: number;
    beforeEach(async () => {
      riceId = await createRecipe(db, friedRice);
      tofuId = await createRecipe(db, { ...friedRice, name: '두부조림' });
      await createRecipeIngredient(db, { recipe_id: riceId, ingredient_name: '달걀', amount: '2개' });
      await createRecipeIngredient(db, { recipe_id: riceId, ingredient_name: '대파', amount: '1/2대' });
      await createRecipeIngredient(db, { recipe_id: tofuId, ingredient_name: '두부', amount: '1/2모' });
      await createRecipeIngredient(db, { recipe_id: tofuId, ingredient_name: '대파', amount: '1/2대' });
      await createIngredient(db, egg); // 달걀은 이미 있다
      await planMeals(db, ['2026-11-16', '2026-11-17'], riceId);
      await refreshShoppingList(db, WEEK, FRI);
    });

    it('계획에 필요하고 보유하지 않은 재료만 합쳐서 만든다', async () => {
      expect(await list()).toEqual([['대파', '1/2대 ×2', 0]]);
    });

    it('다시 계산해도 늘어나지 않는다', async () => {
      await refreshShoppingList(db, WEEK, FRI);
      expect(await list()).toHaveLength(1);
    });

    it('계획이 바뀌면 다시 계산하고, 체크한 항목은 유지한다', async () => {
      const [leek] = await listShoppingItems(db, WEEK);
      await updateShoppingItem(db, leek.id, { ...leek, is_purchased: 1 });

      await planMeals(db, ['2026-11-17'], tofuId);
      await refreshShoppingList(db, WEEK, FRI);
      expect(await list()).toEqual([
        ['대파', '1/2대 ×2', 1],
        ['두부', '1/2모', 0],
      ]);
    });

    it('필요 없어진 항목은 빠지지만 이미 구매한 것은 남는다', async () => {
      await planMeals(db, ['2026-11-17'], tofuId);
      await refreshShoppingList(db, WEEK, FRI);
      const tofu = (await listShoppingItems(db, WEEK)).find((s) => s.ingredient_name === '두부')!;
      await updateShoppingItem(db, tofu.id, { ...tofu, is_purchased: 1 });

      for (const p of await listMealPlans(db, WEEK, FRI)) await deleteMealPlan(db, p.id);
      await refreshShoppingList(db, WEEK, FRI);
      expect(await list()).toEqual([['두부', '1/2모', 1]]);
    });

    it('구매한 항목을 냉장고에 넣으면 재료로 등록되고 목록에서 빠진다', async () => {
      await planMeals(db, ['2026-11-17'], tofuId);
      await refreshShoppingList(db, WEEK, FRI);
      const leek = (await listShoppingItems(db, WEEK)).find((s) => s.ingredient_name === '대파')!;
      await updateShoppingItem(db, leek.id, { ...leek, is_purchased: 1 });

      await storePurchasedItems(db, WEEK, 'freezer', '2026-11-14');
      await refreshShoppingList(db, WEEK, FRI);

      expect(await list()).toEqual([['두부', '1/2모', 0]]);
      expect((await listIngredients(db)).find((i) => i.name === '대파')).toMatchObject({
        storage: 'freezer',
        stored_date: '2026-11-14',
        amount: 'plenty',
        is_used_up: 0,
      });
    });
  });

  it('목록은 그 주 것만', async () => {
    await createShoppingItem(db, { week: '2026-11-09', ingredient_name: '대파', amount: '1단', is_purchased: 0 });
    await createShoppingItem(db, { week: '2026-11-16', ingredient_name: '두부', amount: '1모', is_purchased: 0 });
    expect((await listShoppingItems(db, '2026-11-09')).map((s) => s.ingredient_name)).toEqual(['대파']);
  });
});
