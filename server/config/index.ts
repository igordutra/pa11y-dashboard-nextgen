import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root
dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  mongoUri: z.string().default('mongodb://localhost:27017/pa11y-dashboard'),
  clientUrl: z.string().default('http://localhost:8080'),
  noindex: z.coerce.boolean().default(true),
  readonly: z.coerce.boolean().default(false),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  screenshotsDir: z.string().default(path.join(process.cwd(), 'screenshots')),
  demoMode: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

export const getConfig = (): Config => {
  return configSchema.parse({
    port: process.env.PORT,
    mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE,
    clientUrl: process.env.CLIENT_URL,
    noindex: process.env.NOINDEX,
    readonly: process.env.READONLY,
    nodeEnv: process.env.NODE_ENV,
    demoMode: process.env.DEMO_MODE,
  });
};

const config = getConfig();
export default config;
