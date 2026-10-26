import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import { createSessionValue, isSessionValueValid, safeEqual } from './session.js';

const COOKIE = 'session';
/** Routes reachable without a session. */
const PUBLIC_ROUTES = new Set(['/api/health', '/api/auth/login', '/api/auth/logout']);

const loginBody = z.object({ username: z.string().max(200), password: z.string().max(1000) });

// Used to spend the same time on unknown usernames as on wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 4);

export async function authPlugin(app: FastifyInstance, config: Config): Promise<void> {
  const passwordHash = config.ADMIN_PASSWORD_HASH ?? DUMMY_HASH;
  const ttlMs = config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const secure = config.COOKIE_SECURE
    ? config.COOKIE_SECURE === 'true'
    : config.NODE_ENV === 'production';
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    signed: true,
  } as const;

  await app.register(fastifyCookie, {
    secret: config.SESSION_SECRET ?? 'test-only-secret-not-used-in-production-00',
  });
  await app.register(fastifyRateLimit, { global: false });

  function hasSession(req: FastifyRequest): boolean {
    const raw = req.cookies[COOKIE];
    if (!raw) return false;
    const unsigned = req.unsignCookie(raw);
    return unsigned.valid && isSessionValueValid(unsigned.value, passwordHash);
  }

  app.addHook('onRequest', async (req, reply) => {
    const pathname = req.url.split('?')[0] ?? '';
    if (!pathname.startsWith('/api/') || PUBLIC_ROUTES.has(pathname)) return;
    if (!hasSession(req)) return reply.code(401).send({ error: 'Unauthorized' });
  });

  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const body = loginBody.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: 'Invalid request' });

      const userOk = safeEqual(body.data.username, config.ADMIN_USERNAME);
      const passOk = await bcrypt.compare(body.data.password, passwordHash);
      if (!userOk || !passOk || !config.ADMIN_PASSWORD_HASH) {
        return reply.code(401).send({ error: 'Invalid username or password' });
      }

      reply.setCookie(COOKIE, createSessionValue(passwordHash, ttlMs), {
        ...cookieOptions,
        maxAge: Math.floor(ttlMs / 1000),
      });
      return { username: config.ADMIN_USERNAME };
    },
  );

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE, cookieOptions);
    return { ok: true };
  });

  app.get('/api/auth/me', async () => ({ username: config.ADMIN_USERNAME }));
}
