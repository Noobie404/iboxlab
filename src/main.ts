import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from './core/interceptors/response-envelope.interceptor';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig>);

  const prefix = configService.get('appPrefix', { infer: true })!;
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flight Search Aggregator')
    .setDescription(
      'iBox Lab flight search aggregator — aggregates flight data from multiple providers',
    )
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = configService.get('port', { infer: true })!;
  await app.listen(port);
  console.log(`API: http://localhost:${port}/${prefix}`);
  console.log(`Docs: http://localhost:${port}/docs`);
}
bootstrap();
