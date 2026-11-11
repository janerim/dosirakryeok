import { create } from 'zustand';
import { getDB } from '@/db/database';
import {
  deleteMealPlan,
  listMealPlans,
  markEaten,
  markSkipped,
  planMeals,
  prepareMeals,
  undoMeal,
} from '@/db/mealPlan';
import { useIngredientStore } from '@/store/ingredientStore';
import type { Db, MealPlan } from '@/db/types';

type MealPlanStore = {
  /** 모든 날짜의 식단. 하루에 하나라 양이 적어 통째로 들고 있고, 화면이 날짜로 골라 쓴다. */
  plans: MealPlan[];
  refresh: () => Promise<void>;
  assign: (dates: string[], recipeId: number) => Promise<void>;
  clear: (id: number) => Promise<void>;
  prepare: (from: string, to: string) => Promise<void>;
  eat: (id: number) => Promise<void>;
  skip: (id: number) => Promise<void>;
  undo: (id: number) => Promise<void>;
};

export const useMealPlanStore = create<MealPlanStore>((set, get) => {
  const run = async (action: (db: Db) => Promise<void>) => {
    await action(await getDB());
    await get().refresh();
  };
  // 먹음 처리와 되돌리기는 냉장고 재고도 바꾼다
  const runWithStock = async (action: (db: Db) => Promise<void>) => {
    await run(action);
    await useIngredientStore.getState().refresh();
  };

  return {
    plans: [],
    refresh: async () => {
      set({ plans: await listMealPlans(await getDB(), '0000-01-01', '9999-12-31') });
    },
    assign: (dates, recipeId) => runWithStock((db) => planMeals(db, dates, recipeId)),
    // 먹음 처리했던 칸을 비우면 줄였던 재료도 되돌린다
    clear: (id) =>
      runWithStock(async (db) => {
        await undoMeal(db, id);
        await deleteMealPlan(db, id);
      }),
    prepare: (from, to) => run((db) => prepareMeals(db, from, to)),
    eat: (id) => runWithStock((db) => markEaten(db, id)),
    skip: (id) => run((db) => markSkipped(db, id)),
    undo: (id) => runWithStock((db) => undoMeal(db, id)),
  };
});
