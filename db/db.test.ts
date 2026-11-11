import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, migrate } from './migrations';
import { openTestDb } from './testDb';
import type { Db, IngredientInput, RecipeInput } from './types';
import {
  createIngredient,
  deleteIngredient,
  getIngredient,
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
  updateMealPlan,
} from './mealPlan';
import {
  createShoppingItem,
  deleteShoppingItem,
  getShoppingItem,
  listShoppingItems,
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
    expect(await getMealPlan(db, id)).toEqual({ id, ...input });

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

  it('목록은 그 주 것만', async () => {
    await createShoppingItem(db, { week: '2026-11-09', ingredient_name: '대파', amount: '1단', is_purchased: 0 });
    await createShoppingItem(db, { week: '2026-11-16', ingredient_name: '두부', amount: '1모', is_purchased: 0 });
    expect((await listShoppingItems(db, '2026-11-09')).map((s) => s.ingredient_name)).toEqual(['대파']);
  });
});
