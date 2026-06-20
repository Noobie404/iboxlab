import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { createServer } from 'net';
import configuration from '../../src/config/configuration';
import { FlightsModule } from '../../src/flights/flights.module';
import { BookingsModule } from '../../src/bookings/bookings.module';
import { MockProvidersModule } from '../../src/mock-providers/mock-providers.module';
import { GlobalExceptionFilter } from '../../src/core/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../src/core/interceptors/response-envelope.interceptor';

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

function configureE2eEnv(port: number, mongoUri: string): void {
  process.env.PORT = String(port);
  process.env.APP_PREFIX = 'api';
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_MAX_POOL_SIZE = '10';
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '5000';
  process.env.MONGODB_SOCKET_TIMEOUT_MS = '45000';
  process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  process.env.SEARCH_CACHE_TTL_SECONDS = '300';
  process.env.CACHE_KEY_VERSION = 'v1';
  process.env.DEFAULT_PAGE_LIMIT = '10';
  process.env.MAX_PAGE_LIMIT = '50';
  process.env.BOOKING_REFERENCE_PREFIX = 'BK';
  process.env.FLIGHT_PROVIDERS = JSON.stringify([
    {
      name: 'ProviderA',
      url: `http://127.0.0.1:${port}/api/mock/provider-a`,
      enabled: true,
      timeoutMs: 5000,
    },
    {
      name: 'ProviderB',
      url: `http://127.0.0.1:${port}/api/mock/provider-b`,
      enabled: true,
      timeoutMs: 5000,
    },
    {
      name: 'ProviderC',
      url: `http://127.0.0.1:${port}/api/mock/provider-c`,
      enabled: true,
      timeoutMs: 5000,
    },
  ]);
}

export async function bootstrapE2eApp(
  mongoUri: string,
): Promise<INestApplication> {
  const port = await getAvailablePort();
  configureE2eEnv(port, mongoUri);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration],
        envFilePath: [],
      }),
      MongooseModule.forRoot(mongoUri),
      CacheModule.register({ isGlobal: true }),
      FlightsModule,
      BookingsModule,
      MockProvidersModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  await app.init();
  await app.listen(port);
  return app;
}
