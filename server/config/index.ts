import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root
dotenv.config();

// Helper to correctly parse boolean from environment variables
const envBoolean = (val: any) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
};

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  mongoUri: z.string().default('mongodb://localhost:27017/pa11y-dashboard'),
  clientUrl: z.string().default('http://localhost:8080'),
  noindex: z.preprocess(envBoolean, z.boolean().default(true)),
  readonly: z.preprocess(envBoolean, z.boolean().default(false)),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  screenshotsDir: z.string().default(path.join(process.cwd(), 'screenshots')),
  demoMode: z.preprocess(envBoolean, z.boolean().default(false)),
  authEnabled: z.preprocess(envBoolean, z.boolean().default(false)),
  jwtSecret: z.string().default('default-unsafe-secret'),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  auth0ClientId: z.string().optional(),
  auth0ClientSecret: z.string().optional(),
  auth0Domain: z.string().optional(),
  keycloakClientId: z.string().optional(),
  keycloakClientSecret: z.string().optional(),
  keycloakBaseUrl: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export const getConfig = (): Config => {
  const isTest = process.env.NODE_ENV === 'test';
  return configSchema.parse({
    port: process.env.PORT,
    mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE,
    clientUrl: process.env.CLIENT_URL,
    noindex: process.env.NOINDEX,
    readonly: process.env.READONLY || process.env.DEMO_MODE,
    nodeEnv: process.env.NODE_ENV,
    demoMode: process.env.DEMO_MODE,
    authEnabled: isTest ? false : process.env.AUTH_ENABLED,
    jwtSecret: process.env.JWT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    auth0ClientId: process.env.AUTH0_CLIENT_ID,
    auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET,
    auth0Domain: process.env.AUTH0_DOMAIN,
    keycloakClientId: process.env.KEYCLOAK_CLIENT_ID,
    keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    keycloakBaseUrl: process.env.KEYCLOAK_BASE_URL,
  });
};

const config = getConfig();
export default config;
