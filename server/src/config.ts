import { z } from 'zod';

const schema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8844),
    HOST: z.string().default('0.0.0.0'),
    WEB_DIST: z.string().optional(),
    DATABASE_PATH: z.string().default('./data/app.sqlite'),
    NODE_ENV: z.string().default('development'),
    ADMIN_USERNAME: z.string().min(1).default('admin'),
    /** bcrypt hash, see `npm run hash-password -w server`. */
    ADMIN_PASSWORD_HASH: z.string().optional(),
    SESSION_SECRET: z.string().optional(),
    SESSION_TTL_DAYS: z.coerce.number().positive().default(30),
    /** Defaults to true in production (the app is served over HTTPS by Caddy). */
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'test') return;
    if (!env.ADMIN_PASSWORD_HASH?.startsWith('$2')) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_PASSWORD_HASH'],
        message: 'required, must be a bcrypt hash (run `npm run hash-password -w server`)',
      });
    }
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message: 'required, at least 32 characters (e.g. `openssl rand -hex 32`)',
      });
    }
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  return parsed.data;
}
