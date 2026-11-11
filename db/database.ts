import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';
import type { Db } from './types';

let dbPromise: Promise<Db> | null = null;

/** 앱 전체에서 공유하는 DB 핸들. 처음 호출 시 마이그레이션까지 수행한다. */
export function getDB(): Promise<Db> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open(): Promise<Db> {
  const db = await SQLite.openDatabaseAsync('dosirakryeok.db');
  await db.execAsync('PRAGMA journal_mode = WAL');
  await migrate(db);
  return db;
}
