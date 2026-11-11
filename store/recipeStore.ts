import { create } from 'zustand';
import { getDB } from '@/db/database';
import { listRecipes } from '@/db/recipe';
import type { Recipe } from '@/db/types';

type RecipeStore = {
  recipes: Recipe[];
  refresh: () => Promise<void>;
};

export const useRecipeStore = create<RecipeStore>((set) => ({
  recipes: [],
  refresh: async () => {
    set({ recipes: await listRecipes(await getDB()) });
  },
}));
