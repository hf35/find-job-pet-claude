import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema, type AppDatabase } from './index.js';

let database: AppDatabase;

beforeEach(() => {
  database = openDatabase(':memory:');
});
afterEach(() => database.close());

const vacancy = {
  source: 'hh',
  externalId: '123',
  url: 'https://hh.ru/vacancy/123',
  title: 'Node.js developer',
};

describe('database', () => {
  it('applies migrations and creates all tables', () => {
    const names = database.sqlite
      .prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map((r) => (r as { name: string }).name);
    for (const t of [
      'searches',
      'vacancies',
      'search_vacancies',
      'vacancy_state',
      'filter_results',
      'analyses',
      'letters',
      'profile',
      'runs',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('enforces uniqueness of (source, external_id)', () => {
    const { db } = database;
    db.insert(schema.vacancies).values(vacancy).run();
    expect(() => db.insert(schema.vacancies).values(vacancy).run()).toThrow(/UNIQUE/);
    db.insert(schema.vacancies)
      .values({ ...vacancy, source: 'habr' })
      .run();
  });

  it('applies defaults and round-trips JSON columns', () => {
    const { db } = database;
    const [v] = db
      .insert(schema.vacancies)
      .values({ ...vacancy, skills: ['TypeScript', 'Node.js'] })
      .returning()
      .all();
    expect(v?.archived).toBe(false);
    expect(v?.firstSeenAt).toBeInstanceOf(Date);
    expect(v?.skills).toEqual(['TypeScript', 'Node.js']);
  });

  it('cascades deletes to dependent rows', () => {
    const { db } = database;
    const [v] = db.insert(schema.vacancies).values(vacancy).returning().all();
    db.insert(schema.vacancyState).values({ vacancyId: v!.id, status: 'liked' }).run();
    db.delete(schema.vacancies).where(eq(schema.vacancies.id, v!.id)).run();
    expect(db.select().from(schema.vacancyState).all()).toHaveLength(0);
  });
});
