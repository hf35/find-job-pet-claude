import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

describe('app', () => {
  it('responds to /api/health', async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: 'test', WEB_DIST: '/nonexistent' }));
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
    await app.close();
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: 'test', WEB_DIST: '/nonexistent' }));
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('config', () => {
  it('uses defaults', () => {
    expect(loadConfig({}).PORT).toBe(8844);
  });
  it('rejects invalid port', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid configuration/);
  });
});
