import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { originCheckMiddleware } from './common/security/origin-check.middleware';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const { port, appOrigin, isProduction, trustProxyHops } = configService.get<AppConfig>('app')!;

  app.setGlobalPrefix('api');
  // Behind the production reverse proxies: trust X-Forwarded-* so Secure cookies are issued and rate limits see the client IP.
  if (isProduction) app.set('trust proxy', trustProxyHops);
  app.disable('x-powered-by');

  app.use(cookieParser());
  // CSRF: state-changing API calls must come from the app's own origin (on top of SameSite=Lax cookies).
  app.use(originCheckMiddleware(appOrigin, ['/api/webhooks/']));

  // The SPA is served from APP_URL (same origin in production and through the Vite dev proxy).
  app.enableCors({ origin: appOrigin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(port);
}

void bootstrap();
