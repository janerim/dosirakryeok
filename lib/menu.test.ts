import { describe, expect, it } from 'vitest';
import type { Ingredient, Recipe, RecipeIngredient } from '@/db/types';
import { rankRecipes } from './menu';

const TODAY = '2026-11-11';

const recipe = (id: number, name: string): Recipe => ({
  id,
  name,
  cook_minutes: 10,
  steps: [],
  storage_method: '',
  storage_days: 3,
});

let nextId = 1;
const needs = (recipeId: number, ...names: string[]): RecipeIngredient[] =>
  names.map((n) => ({ id: nextId++, recipe_id: recipeId, ingredient_name: n, amount: '1개' }));

const held = (name: string, over: Partial<Ingredient> = {}): Ingredient => ({
  id: nextId++,
  name,
  storage: 'fridge',
  stored_date: TODAY,
  amount: 'plenty',
  is_used_up: 0,
  ...over,
});

const recipes = [recipe(1, '두부조림'), recipe(2, '달걀볶음밥'), recipe(3, '간장불고기')];
const recipeIngredients = [
  ...needs(1, '두부', '간장', '대파'),
  ...needs(2, '밥', '달걀', '대파', '간장'),
  ...needs(3, '소고기', '양파'),
];

const names = (r: ReturnType<typeof rankRecipes>) => r.map((x) => x.recipe.name);

describe('rankRecipes', () => {
  it('겹치는 재료 수가 많은 순으로 정렬한다', () => {
    const ranked = rankRecipes(
      recipes,
      recipeIngredients,
      [held('달걀'), held('대파'), held('간장'), held('양파')],
      TODAY
    );
    expect(names(ranked)).toEqual(['달걀볶음밥', '두부조림', '간장불고기']);
    expect(ranked.map((r) => r.have.length)).toEqual([3, 2, 1]);
  });

  it('겹치는 재료와 부족한 재료를 레시피에 적힌 순서로 돌려준다', () => {
    const [first] = rankRecipes(recipes, recipeIngredients, [held('간장'), held('달걀')], TODAY);
    expect(first.recipe.name).toBe('달걀볶음밥');
    expect(first.have).toEqual(['달걀', '간장']);
    expect(first.missing).toEqual(['밥', '대파']);
  });

  it('겹치는 수가 같으면 부족한 재료가 적은 것, 그다음은 이름순', () => {
    // 대파: 두부조림(부족 2), 달걀볶음밥(부족 3)
    expect(names(rankRecipes(recipes, recipeIngredients, [held('대파')], TODAY))).toEqual([
      '두부조림',
      '달걀볶음밥',
      '간장불고기',
    ]);
    // 보유 재료가 없으면 부족 수 → 이름순
    expect(names(rankRecipes(recipes, recipeIngredients, [], TODAY))).toEqual([
      '간장불고기',
      '두부조림',
      '달걀볶음밥',
    ]);
  });

  it('소진했거나 남은 양이 없음인 재료는 보유로 치지 않는다', () => {
    const ranked = rankRecipes(
      recipes,
      recipeIngredients,
      [held('두부', { is_used_up: 1 }), held('대파', { amount: 'none' })],
      TODAY
    );
    expect(ranked.every((r) => r.have.length === 0)).toBe(true);
  });

  it('같은 이름을 여러 번 등록해도 한 번만 센다', () => {
    const [first] = rankRecipes(recipes, recipeIngredients, [held('두부'), held('두부')], TODAY);
    expect(first.have).toEqual(['두부']);
  });

  it('오래된 재료를 쓰는 레시피에 표시한다', () => {
    const ranked = rankRecipes(
      recipes,
      recipeIngredients,
      [held('두부', { stored_date: '2026-11-01' }), held('양파')],
      TODAY
    );
    const stale = Object.fromEntries(ranked.map((r) => [r.recipe.name, r.usesStale]));
    expect(stale).toEqual({ 두부조림: true, 달걀볶음밥: false, 간장불고기: false });
  });

  it('오래됐어도 소진한 재료는 표시하지 않는다', () => {
    const ranked = rankRecipes(
      recipes,
      recipeIngredients,
      [held('두부', { stored_date: '2026-11-01', is_used_up: 1 })],
      TODAY
    );
    expect(ranked.some((r) => r.usesStale)).toBe(false);
  });
});
