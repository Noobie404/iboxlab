import { ProviderConfig } from './providers.config';

export interface AppConfig {
  port: number;
  appPrefix: string;
  mongodb: {
    uri: string;
    maxPoolSize: number;
    serverSelectionTimeoutMs: number;
    socketTimeoutMs: number;
  };
  redis: { url: string };
  providers: ProviderConfig[];
  cache: { searchTtlSeconds: number; keyVersion: string };
  pagination: { defaultLimit: number; maxLimit: number };
  booking: { referencePrefix: string };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireIntEnv(name: string): number {
  const value = requireEnv(name);
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer`);
  }
  return parsed;
}

function requireProviders(): ProviderConfig[] {
  const raw = requireEnv('FLIGHT_PROVIDERS');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FLIGHT_PROVIDERS env var is not valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('FLIGHT_PROVIDERS must be a JSON array');
  }
  return parsed as ProviderConfig[];
}

export default (): AppConfig => ({
  port: requireIntEnv('PORT'),
  appPrefix: requireEnv('APP_PREFIX'),
  mongodb: {
    uri: requireEnv('MONGODB_URI'),
    maxPoolSize: requireIntEnv('MONGODB_MAX_POOL_SIZE'),
    serverSelectionTimeoutMs: requireIntEnv(
      'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
    ),
    socketTimeoutMs: requireIntEnv('MONGODB_SOCKET_TIMEOUT_MS'),
  },
  redis: {
    url: requireEnv('REDIS_URL'),
  },
  providers: requireProviders(),
  cache: {
    searchTtlSeconds: requireIntEnv('SEARCH_CACHE_TTL_SECONDS'),
    keyVersion: requireEnv('CACHE_KEY_VERSION'),
  },
  pagination: {
    defaultLimit: requireIntEnv('DEFAULT_PAGE_LIMIT'),
    maxLimit: requireIntEnv('MAX_PAGE_LIMIT'),
  },
  booking: {
    referencePrefix: requireEnv('BOOKING_REFERENCE_PREFIX'),
  },
});
