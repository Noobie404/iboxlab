import configuration from '@src/config/configuration';

const REQUIRED_ENV: Record<string, string> = {
  PORT: '3000',
  APP_PREFIX: 'api',
  MONGODB_URI: 'mongodb://localhost:27017/flight-aggregator',
  MONGODB_MAX_POOL_SIZE: '10',
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: '5000',
  MONGODB_SOCKET_TIMEOUT_MS: '45000',
  REDIS_URL: 'redis://localhost:6379',
  SEARCH_CACHE_TTL_SECONDS: '300',
  CACHE_KEY_VERSION: 'v1',
  DEFAULT_PAGE_LIMIT: '10',
  MAX_PAGE_LIMIT: '50',
  BOOKING_REFERENCE_PREFIX: 'BK',
  FLIGHT_PROVIDERS:
    '[{"name":"ProviderA","url":"http://localhost:3000/api/mock/provider-a","enabled":true,"timeoutMs":5000}]',
};

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...REQUIRED_ENV };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads config when all required env vars are set', () => {
    const config = configuration();

    expect(config.port).toBe(3000);
    expect(config.appPrefix).toBe('api');
    expect(config.mongodb.uri).toBe(REQUIRED_ENV.MONGODB_URI);
    expect(config.providers).toHaveLength(1);
    expect(config.cache.searchTtlSeconds).toBe(300);
    expect(config.cache.keyVersion).toBe('v1');
    expect(config.mongodb.maxPoolSize).toBe(10);
  });

  it.each(Object.keys(REQUIRED_ENV))(
    'throws when %s is missing',
    (key) => {
      process.env = { ...originalEnv, ...REQUIRED_ENV };
      delete process.env[key];

      expect(() => configuration()).toThrow(
        `Missing required environment variable: ${key}`,
      );
    },
  );

  it('throws when FLIGHT_PROVIDERS is invalid JSON', () => {
    process.env.FLIGHT_PROVIDERS = 'not-json';

    expect(() => configuration()).toThrow(
      'FLIGHT_PROVIDERS env var is not valid JSON',
    );
  });

  it('throws when FLIGHT_PROVIDERS is not an array', () => {
    process.env.FLIGHT_PROVIDERS = '{"name":"ProviderA"}';

    expect(() => configuration()).toThrow('FLIGHT_PROVIDERS must be a JSON array');
  });

  it('throws when PORT is not an integer', () => {
    process.env.PORT = 'abc';

    expect(() => configuration()).toThrow(
      'Environment variable PORT must be a valid integer',
    );
  });
});
