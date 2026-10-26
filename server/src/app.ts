import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type { Config } from './config.js';
import { authPlugin } from './auth/plugin.js';
import { openDatabase, type Db } from './db/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(here, '../package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: 'info' },
    trustProxy: true,
  });
  const version = readVersion();

  const database = openDatabase(config.DATABASE_PATH);
  app.decorate('db', database.db);
  app.addHook('onClose', async () => database.close());

  await authPlugin(app, config);

  app.get('/api/health', async () => {
    database.sqlite.prepare('select 1').get();
    return { status: 'ok', version };
  });

  const webDist = path.resolve(config.WEB_DIST ?? path.join(here, '../../web/dist'));
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found' });
    });
  } else {
    app.log.warn(`Web build not found at ${webDist}; serving API only`);
  }

  return app;
}
