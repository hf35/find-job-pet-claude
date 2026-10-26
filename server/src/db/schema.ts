import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const now = sql`(unixepoch() * 1000)`;
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const searches = sqliteTable('searches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  source: text('source').notNull().default('hh'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  /** Source-specific query parameters (layer 1). */
  params: text('params', { mode: 'json' }).notNull().$type<Record<string, unknown>>().default({}),
  /** Local filtering rules (layer 2). */
  rules: text('rules', { mode: 'json' }).notNull().$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').notNull().default(now),
  updatedAt: timestamp('updated_at').notNull().default(now),
});

export const vacancies = sqliteTable(
  'vacancies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    company: text('company'),
    companyId: text('company_id'),
    area: text('area'),
    salaryFrom: integer('salary_from'),
    salaryTo: integer('salary_to'),
    salaryCurrency: text('salary_currency'),
    salaryGross: integer('salary_gross', { mode: 'boolean' }),
    workFormat: text('work_format', { mode: 'json' }).$type<string[]>(),
    experience: text('experience'),
    employment: text('employment'),
    skills: text('skills', { mode: 'json' }).notNull().$type<string[]>().default([]),
    description: text('description'),
    publishedAt: timestamp('published_at'),
    firstSeenAt: timestamp('first_seen_at').notNull().default(now),
    lastSeenAt: timestamp('last_seen_at').notNull().default(now),
    /** Gone from search results or closed at the source. */
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    /** Original source payload, kept so it can be re-parsed later. */
    raw: text('raw', { mode: 'json' }),
  },
  (t) => [
    uniqueIndex('vacancies_source_external_id').on(t.source, t.externalId),
    index('vacancies_first_seen_at').on(t.firstSeenAt),
  ],
);

export const searchVacancies = sqliteTable(
  'search_vacancies',
  {
    searchId: integer('search_id')
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    vacancyId: integer('vacancy_id')
      .notNull()
      .references(() => vacancies.id, { onDelete: 'cascade' }),
    foundAt: timestamp('found_at').notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.searchId, t.vacancyId] })],
);

export const VACANCY_STATUSES = ['new', 'liked', 'disliked', 'hidden', 'applied'] as const;
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];

export const vacancyState = sqliteTable('vacancy_state', {
  vacancyId: integer('vacancy_id')
    .primaryKey()
    .references(() => vacancies.id, { onDelete: 'cascade' }),
  status: text('status', { enum: VACANCY_STATUSES }).notNull().default('new'),
  comment: text('comment'),
  updatedAt: timestamp('updated_at').notNull().default(now),
});

export const filterResults = sqliteTable('filter_results', {
  vacancyId: integer('vacancy_id')
    .primaryKey()
    .references(() => vacancies.id, { onDelete: 'cascade' }),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  reasons: text('reasons', { mode: 'json' }).notNull().$type<string[]>().default([]),
  bonus: real('bonus').notNull().default(0),
  evaluatedAt: timestamp('evaluated_at').notNull().default(now),
});

export const analyses = sqliteTable(
  'analyses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    vacancyId: integer('vacancy_id')
      .notNull()
      .references(() => vacancies.id, { onDelete: 'cascade' }),
    /** Hash of the profile text used, so a changed profile invalidates the cache. */
    profileHash: text('profile_hash').notNull(),
    model: text('model').notNull(),
    score: integer('score').notNull(),
    summary: text('summary').notNull(),
    pros: text('pros', { mode: 'json' }).notNull().$type<string[]>().default([]),
    cons: text('cons', { mode: 'json' }).notNull().$type<string[]>().default([]),
    redFlags: text('red_flags', { mode: 'json' }).notNull().$type<string[]>().default([]),
    /** Full structured model output. */
    data: text('data', { mode: 'json' }),
    createdAt: timestamp('created_at').notNull().default(now),
  },
  (t) => [uniqueIndex('analyses_cache_key').on(t.vacancyId, t.profileHash, t.model)],
);

export const letters = sqliteTable(
  'letters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    vacancyId: integer('vacancy_id')
      .notNull()
      .references(() => vacancies.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    body: text('body').notNull(),
    model: text('model'),
    createdAt: timestamp('created_at').notNull().default(now),
  },
  (t) => [uniqueIndex('letters_vacancy_version').on(t.vacancyId, t.version)],
);

/** Single-row table (id is always 1). */
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  resume: text('resume').notNull().default(''),
  preferences: text('preferences').notNull().default(''),
  letterExamples: text('letter_examples', { mode: 'json' }).notNull().$type<string[]>().default([]),
  updatedAt: timestamp('updated_at').notNull().default(now),
});

export const runs = sqliteTable('runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trigger: text('trigger', { enum: ['schedule', 'manual'] }).notNull(),
  status: text('status', { enum: ['running', 'ok', 'error'] }).notNull(),
  startedAt: timestamp('started_at').notNull().default(now),
  finishedAt: timestamp('finished_at'),
  stats: text('stats', { mode: 'json' }).$type<Record<string, number>>(),
  error: text('error'),
});
