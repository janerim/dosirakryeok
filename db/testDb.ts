import { DatabaseSync } from 'node:sqlite';
import type { Db, Param } from './types';

/** 테스트 전용. node:sqlite 를 repository 가 쓰는 Db 모양에 맞춘다. 앱 번들에는 들어가지 않는다. */
export function openTestDb(path = ':memory:'): Db & { close(): void } {
  const raw = new DatabaseSync(path);
  return {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params) {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync<T>(sql: string, params: Param[]) {
      return raw.prepare(sql).all(...params).map((r) => ({ ...r })) as T[];
    },
    async getFirstAsync<T>(sql: string, params: Param[]) {
      const r = raw.prepare(sql).get(...params);
      return r ? ({ ...r } as T) : null;
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
    close() {
      raw.close();
    },
  };
}
