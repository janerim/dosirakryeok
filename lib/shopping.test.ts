import { describe, expect, it } from 'vitest';
import type { Ingredient, MealPlan, MealStatus, RecipeIngredient } from '@/db/types';
import { computeShoppingNeeds } from './shopping';

let nextId = 1;
const plan = (date: string, recipeId: number, status: MealStatus = 'planned'): MealPlan => ({
  id: nextId++,
  date,
  recipe_id: recipeId,
  status,
  prev_status: null,
});
const needs = (recipeId: number, ...pairs: [string, string][]): RecipeIngredient[] =>
  pairs.map(([name, amount]) => ({
    id: nextId++,
    recipe_id: recipeId,
    ingredient_name: name,
    amount,
  }));
const held = (name: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id: nextId++,
  name,
  storage: 'fridge',
  stored_date: '2026-11-11',
  amount: 'plenty',
  is_used_up: 0,
  ...over,
});

// 1: 달걀볶음밥, 2: 두부조림
const recipeIngredients = [
  ...needs(1, ['달걀', '2개'], ['대파', '1/2대'], ['간장', '1큰술']),
  ...needs(2, ['두부', '1/2모'], ['대파', '1/2대'], ['간장', '2큰술']),
];

describe('computeShoppingNeeds', () => {
  it('계획에 필요한 재료 중 보유하지 않은 것만 모은다', () => {
    const list = computeShoppingNeeds(
      [plan('2026-11-16', 1)],
      recipeIngredients,
      [held('간장')]
    );
    expect(list).toEqual([
      { name: '달걀', amount: '2개' },
      { name: '대파', amount: '1/2대' },
    ]);
  });

  it('남은 양이 없음이거나 소진한 재료는 사야 한다', () => {
    const list = computeShoppingNeeds(
      [plan('2026-11-16', 1)],
      recipeIngredients,
      [held('달걀', { amount: 'none' }), held('대파', { is_used_up: 1 }), held('간장')]
    );
    expect(list.map((n) => n.name)).toEqual(['달걀', '대파']);
  });

  it('여러 메뉴에 쓰이는 재료는 하나로 합친다', () => {
    const list = computeShoppingNeeds(
      [plan('2026-11-16', 1), plan('2026-11-17', 2), plan('2026-11-18', 1)],
      recipeIngredients,
      []
    );
    expect(list).toEqual([
      { name: '달걀', amount: '2개 ×2' },
      { name: '대파', amount: '1/2대 ×3' },
      { name: '간장', amount: '1큰술 ×2 + 2큰술' },
      { name: '두부', amount: '1/2모' },
    ]);
  });

  it('계획 상태가 아닌 식단은 세지 않는다', () => {
    const list = computeShoppingNeeds(
      [plan('2026-11-16', 1, 'prepared'), plan('2026-11-17', 1, 'eaten'), plan('2026-11-18', 1, 'skipped')],
      recipeIngredients,
      []
    );
    expect(list).toEqual([]);
  });
});
