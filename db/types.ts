export type Param = string | number | null;

/**
 * repository 가 쓰는 DB 핸들의 최소 모양.
 * 앱에서는 expo-sqlite 의 SQLiteDatabase 가, 테스트에서는 node:sqlite 어댑터(testDb.ts)가 들어온다.
 */
export type Db = {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    params: Param[]
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params: Param[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: Param[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};

export type Storage = 'fridge' | 'freezer' | 'room'; // 냉장 / 냉동 / 실온
export type Amount = 'plenty' | 'little' | 'none'; // 넉넉 / 조금 / 없음
export type MealStatus = 'planned' | 'prepared' | 'eaten' | 'skipped'; // 계획 / 준비됨 / 먹음 / 건너뜀

export type Ingredient = {
  id: number;
  name: string;
  storage: Storage;
  stored_date: string; // yyyy-MM-dd
  amount: Amount;
  is_used_up: number; // 0 | 1
};
export type IngredientInput = Omit<Ingredient, 'id'>;

export type Recipe = {
  id: number;
  name: string;
  cook_minutes: number;
  steps: string[]; // DB 에는 JSON 문자열로 저장한다
  storage_method: string;
  storage_days: number;
};
export type RecipeInput = Omit<Recipe, 'id'>;

export type RecipeIngredient = {
  id: number;
  recipe_id: number;
  ingredient_name: string;
  amount: string;
};
export type RecipeIngredientInput = Omit<RecipeIngredient, 'id'>;

export type MealPlan = {
  id: number;
  date: string; // yyyy-MM-dd
  recipe_id: number;
  status: MealStatus;
  prev_status: MealStatus | null; // 먹음·건너뜀으로 바꾸기 전 상태. 되돌릴 때 쓴다
};
export type MealPlanInput = Omit<MealPlan, 'id' | 'prev_status'>;

export type ShoppingItem = {
  id: number;
  week: string; // 그 주 월요일, yyyy-MM-dd
  ingredient_name: string;
  amount: string;
  is_purchased: number; // 0 | 1
};
export type ShoppingItemInput = Omit<ShoppingItem, 'id'>;
