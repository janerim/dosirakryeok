import { create } from 'zustand';
import { FREQUENT_LIMIT } from '@/constants/storage';
import { getDB } from '@/db/database';
import {
  createIngredient,
  listFrequentIngredients,
  listIngredients,
  updateIngredient,
} from '@/db/ingredient';
import type { Ingredient, IngredientInput } from '@/db/types';

type IngredientStore = {
  items: Ingredient[];
  frequent: Pick<Ingredient, 'name' | 'storage'>[];
  refresh: () => Promise<void>;
  add: (input: IngredientInput) => Promise<void>;
  edit: (id: number, input: IngredientInput) => Promise<void>;
};

export const useIngredientStore = create<IngredientStore>((set, get) => ({
  items: [],
  frequent: [],
  refresh: async () => {
    const db = await getDB();
    const [items, frequent] = await Promise.all([
      listIngredients(db),
      listFrequentIngredients(db, FREQUENT_LIMIT),
    ]);
    set({ items, frequent });
  },
  add: async (input) => {
    await createIngredient(await getDB(), input);
    await get().refresh();
  },
  edit: async (id, input) => {
    await updateIngredient(await getDB(), id, input);
    await get().refresh();
  },
}));
