import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

describe('app', () => {
  it('responds to /api/health', async () => {
    const app = await buildApp(
      loadConfig({ NODE_ENV: 'test', WEB_DIST: '/nonexistent', DATABASE_PATH: ':memory:' }),
    );
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
    await app.close();
  });
});

describe('config', () => {
  it('uses defaults', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).PORT).toBe(8844);
  });
  it('rejects invalid port', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid configuration/);
  });
});
