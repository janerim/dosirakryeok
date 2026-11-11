import type { Db } from './types';

/**
 * 순서대로 적용되는 마이그레이션. 배열 인덱스+1 이 PRAGMA user_version 이 된다.
 * 한 번 배포된 항목은 수정하지 말고 새 항목을 뒤에 추가한다.
 */
export const MIGRATIONS: ((db: Db) => Promise<void>)[] = [
  // v1: docs/plan.md "데이터 모델" 의 테이블 5개
  async (db) => {
    await db.execAsync(`
      CREATE TABLE ingredient (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        storage     TEXT NOT NULL CHECK (storage IN ('fridge', 'freezer', 'room')),
        stored_date TEXT NOT NULL,
        amount      TEXT NOT NULL CHECK (amount IN ('plenty', 'little', 'none')),
        is_used_up  INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE recipe (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        cook_minutes   INTEGER NOT NULL,
        steps          TEXT NOT NULL,
        storage_method TEXT NOT NULL,
        storage_days   INTEGER NOT NULL
      );

      CREATE TABLE recipe_ingredient (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id       INTEGER NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
        ingredient_name TEXT NOT NULL,
        amount          TEXT NOT NULL
      );
      CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient(recipe_id);

      CREATE TABLE meal_plan (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        date      TEXT NOT NULL,
        recipe_id INTEGER NOT NULL REFERENCES recipe(id),
        status    TEXT NOT NULL CHECK (status IN ('planned', 'prepared', 'eaten', 'skipped'))
      );
      CREATE INDEX idx_meal_plan_date ON meal_plan(date);

      CREATE TABLE shopping_item (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        week            TEXT NOT NULL,
        ingredient_name TEXT NOT NULL,
        amount          TEXT NOT NULL,
        is_purchased    INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_shopping_item_week ON shopping_item(week);
    `);
  },

  // v2: 먹음 처리 되돌리기 — 바꾸기 전 상태와, 먹을 때 줄인 재료를 적어 둔다
  async (db) => {
    await db.execAsync(`
      ALTER TABLE meal_plan ADD COLUMN prev_status TEXT;

      CREATE TABLE meal_consumption (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_plan_id  INTEGER NOT NULL REFERENCES meal_plan(id) ON DELETE CASCADE,
        ingredient_id INTEGER NOT NULL REFERENCES ingredient(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_meal_consumption_plan ON meal_consumption(meal_plan_id);
    `);
  },

  // v3: 알림 설정 같은 앱 설정을 키-값으로 저장한다
  async (db) => {
    await db.execAsync(`
      CREATE TABLE setting (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
];

/** 저장된 user_version 부터 최신까지 올린다. 버전 하나가 트랜잭션 하나다. */
export async function migrate(db: Db): Promise<void> {
  // 외래 키는 연결마다 켜야 하고, 트랜잭션 안에서는 바꿀 수 없다
  await db.execAsync('PRAGMA foreign_keys = ON');
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
    []
  );
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[v](db);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
