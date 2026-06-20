import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import configuration, { AppConfig } from './config/configuration';
import { CoreModule } from './core/core.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FlightsModule } from './flights/flights.module';
import { BookingsModule } from './bookings/bookings.module';
import { MockProvidersModule } from './mock-providers/mock-providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    CoreModule,

    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService<AppConfig>) => ({
        uri: config.get('mongodb.uri', { infer: true }),
        maxPoolSize: config.get('mongodb.maxPoolSize', { infer: true }),
        serverSelectionTimeoutMS: config.get(
          'mongodb.serverSelectionTimeoutMs',
          { infer: true },
        ),
        socketTimeoutMS: config.get('mongodb.socketTimeoutMs', { infer: true }),
      }),
      inject: [ConfigService],
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (config: ConfigService<AppConfig>) => ({
        stores: [createKeyv(config.get('redis.url', { infer: true })!)],
      }),
      inject: [ConfigService],
    }),

    FlightsModule,
    BookingsModule,
    MockProvidersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
