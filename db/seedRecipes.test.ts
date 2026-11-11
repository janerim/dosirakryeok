import { beforeEach, describe, expect, it } from 'vitest';
import seeds from '../assets/recipes.json';
import { createMealPlan, getMealPlan } from './mealPlan';
import { migrate } from './migrations';
import { listRecipes } from './recipe';
import { listRecipeIngredients } from './recipeIngredient';
import { syncSeedRecipes, type SeedRecipe } from './seedRecipes';
import { openTestDb } from './testDb';
import type { Db } from './types';

const rice: SeedRecipe = {
  name: '달걀볶음밥',
  cook_minutes: 10,
  ingredients: [
    { name: '밥', amount: '1공기' },
    { name: '달걀', amount: '2개' },
  ],
  steps: ['볶는다'],
  storage_method: '냉장',
  storage_days: 3,
};

let db: Db;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

describe('syncSeedRecipes', () => {
  it('빈 DB 에 레시피와 재료를 넣는다', async () => {
    await syncSeedRecipes(db, [rice]);
    const [recipe] = await listRecipes(db);
    expect(recipe).toMatchObject({ name: '달걀볶음밥', cook_minutes: 10, steps: ['볶는다'] });
    expect((await listRecipeIngredients(db, recipe.id)).map((i) => i.ingredient_name)).toEqual([
      '밥',
      '달걀',
    ]);
  });

  it('다시 불러도 늘어나지 않는다', async () => {
    await syncSeedRecipes(db, [rice]);
    await syncSeedRecipes(db, [rice]);
    const recipes = await listRecipes(db);
    expect(recipes).toHaveLength(1);
    expect(await listRecipeIngredients(db, recipes[0].id)).toHaveLength(2);
  });

  it('시드에 추가한 항목이 나타난다', async () => {
    await syncSeedRecipes(db, [rice]);
    await syncSeedRecipes(db, [rice, { ...rice, name: '두부조림' }]);
    expect((await listRecipes(db)).map((r) => r.name)).toEqual(['달걀볶음밥', '두부조림']);
  });

  it('시드를 고치면 같은 레시피가 바뀌고, 식단은 그대로 가리킨다', async () => {
    await syncSeedRecipes(db, [rice]);
    const [before] = await listRecipes(db);
    const planId = await createMealPlan(db, {
      date: '2026-11-09',
      recipe_id: before.id,
      status: 'planned',
    });

    await syncSeedRecipes(db, [
      { ...rice, cook_minutes: 12, ingredients: [{ name: '밥', amount: '2공기' }] },
    ]);
    const [after] = await listRecipes(db);
    expect(after).toMatchObject({ id: before.id, cook_minutes: 12 });
    expect(await listRecipeIngredients(db, after.id)).toMatchObject([
      { ingredient_name: '밥', amount: '2공기' },
    ]);
    expect((await getMealPlan(db, planId))?.recipe_id).toBe(before.id);
  });
});

describe('assets/recipes.json', () => {
  it('형식이 맞고 DB 에 들어간다', async () => {
    await syncSeedRecipes(db, seeds);
    expect(await listRecipes(db)).toHaveLength(seeds.length);
  });

  it('이름이 겹치지 않는다', () => {
    expect(new Set(seeds.map((s) => s.name)).size).toBe(seeds.length);
  });

  it.each(seeds)('$name: 필드가 채워져 있고 조건을 지킨다', (s) => {
    expect(s.name.trim()).not.toBe('');
    expect(s.storage_method.trim()).not.toBe('');
    expect(s.storage_days).toBeGreaterThan(0);
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.ingredients.length).toBeGreaterThan(0);
    for (const i of s.ingredients) {
      expect(i.name.trim()).not.toBe('');
      expect(i.amount.trim()).not.toBe('');
    }
    // 도시락 메뉴 조건: 재료 5개 이하, 조리 15분 이내
    expect(s.ingredients.length).toBeLessThanOrEqual(5);
    expect(s.cook_minutes).toBeLessThanOrEqual(15);
  });
});
