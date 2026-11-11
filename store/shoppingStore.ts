import { create } from 'zustand';
import { getDB } from '@/db/database';
import {
  listShoppingItems,
  refreshShoppingList,
  storePurchasedItems,
  updateShoppingItem,
} from '@/db/shoppingItem';
import { weekdaysOf } from '@/lib/week';
import { useIngredientStore } from '@/store/ingredientStore';
import type { ShoppingItem, Storage } from '@/db/types';

type ShoppingStore = {
  items: ShoppingItem[];
  /** 그 주(월요일)의 목록을 계획과 냉장고에 맞춰 다시 계산해 읽는다 */
  load: (week: string) => Promise<void>;
  toggle: (item: ShoppingItem) => Promise<void>;
  putAway: (week: string, storage: Storage, today: string) => Promise<void>;
};

// 다시 계산이 겹쳐 돌면 같은 항목이 두 번 들어갈 수 있어 한 줄로 세운다
let queue: Promise<void> = Promise.resolve();
const enqueue = (task: () => Promise<void>) => {
  const next = queue.then(task);
  queue = next.catch(() => {});
  return next;
};

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  load: (week) =>
    enqueue(async () => {
      const db = await getDB();
      await refreshShoppingList(db, week, weekdaysOf(week)[4]);
      set({ items: await listShoppingItems(db, week) });
    }),
  toggle: (item) =>
    enqueue(async () => {
      const db = await getDB();
      await updateShoppingItem(db, item.id, {
        ...item,
        is_purchased: item.is_purchased === 1 ? 0 : 1,
      });
      set({ items: await listShoppingItems(db, item.week) });
    }),
  putAway: async (week, storage, today) => {
    await enqueue(async () => storePurchasedItems(await getDB(), week, storage, today));
    // 냉장고가 바뀌면 화면이 load 를 다시 불러 목록을 맞춘다
    await useIngredientStore.getState().refresh();
    await get().load(week);
  },
}));
