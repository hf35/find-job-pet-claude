import bcrypt from 'bcryptjs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createSessionValue, isSessionValueValid } from './session.js';

let hash: string;
beforeAll(() => {
  hash = bcrypt.hashSync('correct horse', 4);
});

let app: FastifyInstance;
afterEach(async () => app?.close());

async function setup() {
  app = await buildApp(
    loadConfig({
      NODE_ENV: 'test',
      WEB_DIST: '/nonexistent',
      DATABASE_PATH: ':memory:',
      ADMIN_USERNAME: 'me',
      ADMIN_PASSWORD_HASH: hash,
      SESSION_SECRET: 'x'.repeat(40),
    }),
  );
  return app;
}

const login = (a: FastifyInstance, password = 'correct horse', username = 'me') =>
  a.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });

function sessionCookie(res: Awaited<ReturnType<typeof login>>) {
  const c = res.cookies.find((x) => x.name === 'session');
  return c;
}

describe('auth', () => {
  it('rejects protected routes without a session', async () => {
    const a = await setup();
    expect((await a.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401);
    expect((await a.inject({ method: 'GET', url: '/api/anything' })).statusCode).toBe(401);
  });

  it('keeps /api/health public', async () => {
    const a = await setup();
    expect((await a.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
  });

  it('logs in and grants access with an httpOnly cookie', async () => {
    const a = await setup();
    const res = await login(a);
    expect(res.statusCode).toBe(200);
    const cookie = sessionCookie(res);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });

    const me = await a.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { session: cookie!.value },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ username: 'me' });

    const unknown = await a.inject({
      method: 'GET',
      url: '/api/nope',
      cookies: { session: cookie!.value },
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('rejects wrong password and wrong username', async () => {
    const a = await setup();
    expect((await login(a, 'nope')).statusCode).toBe(401);
    expect((await login(a, 'correct horse', 'someone')).statusCode).toBe(401);
    expect(sessionCookie(await login(a, 'nope'))).toBeUndefined();
  });

  it('rejects malformed login bodies', async () => {
    const a = await setup();
    const res = await a.inject({ method: 'POST', url: '/api/auth/login', payload: { x: 1 } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a tampered or unsigned cookie', async () => {
    const a = await setup();
    const cookie = sessionCookie(await login(a))!;
    for (const value of [cookie.value + 'x', 'abc', `${Date.now() + 1e9}.0000000000000000`]) {
      const res = await a.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { session: value },
      });
      expect(res.statusCode).toBe(401);
    }
  });

  it('clears the cookie on logout', async () => {
    const a = await setup();
    const res = await a.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(sessionCookie(res as never)?.value).toBe('');
  });

  it('rate-limits login attempts', async () => {
    const a = await setup();
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await login(a, 'nope')).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes[11]).toBe(429);
  });
});

describe('session value', () => {
  it('accepts a fresh value and rejects expired or foreign ones', () => {
    const now = 1_000_000;
    const value = createSessionValue('hash-a', 1000, now);
    expect(isSessionValueValid(value, 'hash-a', now + 500)).toBe(true);
    expect(isSessionValueValid(value, 'hash-a', now + 1000)).toBe(false);
    expect(isSessionValueValid(value, 'hash-b', now + 500)).toBe(false);
    expect(isSessionValueValid('garbage', 'hash-a', now)).toBe(false);
  });
});

describe('config', () => {
  it('requires credentials outside of tests', () => {
    expect(() => loadConfig({})).toThrow(/ADMIN_PASSWORD_HASH/);
    expect(() => loadConfig({ ADMIN_PASSWORD_HASH: hash, SESSION_SECRET: 'short' })).toThrow(
      /SESSION_SECRET/,
    );
    expect(() =>
      loadConfig({ ADMIN_PASSWORD_HASH: hash, SESSION_SECRET: 'x'.repeat(32) }),
    ).not.toThrow();
  });
});
