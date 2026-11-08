import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './config/env.schema';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CustomLogger } from './core/logger/logger.service';
import { API_DOCS_PATH, GLOBAL_PREFIX } from './core/constants';
import { getWelcomeHtml } from './welcome.html';
import type { Request, Response } from 'express';

async function bootstrap() {
  const logger = new CustomLogger();
  logger.log('Bootstrap starting...', 'Bootstrap');
  try {
    const app = await NestFactory.create(AppModule, {
      logger,
    });

    app.setGlobalPrefix(GLOBAL_PREFIX);

    // Enable URI versioning (e.g. /api/v1/auth/login)
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // strips properties not defined in the DTO
        forbidNonWhitelisted: true, // throws if extra unknown properties are sent
        transform: true, // auto-converts payloads into DTO class instances
      }),
    );

    const configService = app.get(ConfigService<EnvConfig, true>);
    const port = configService.get('PORT', { infer: true });

    // Handle root landing page at http://localhost:5000
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('/', (req: Request, res: Response) => {
      if (
        req.headers.accept &&
        req.headers.accept.includes('application/json') &&
        !req.headers.accept.includes('text/html')
      ) {
        return res.json({
          message: 'welcome to SHAVARCHALA SHANTI SANGHA server',
          status: 'online',
          port,
          timestamp: new Date().toISOString(),
        });
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(getWelcomeHtml());
    });

    // Convenient redirect from /api to /api/docs
    expressApp.get(`/${GLOBAL_PREFIX}`, (req: Request, res: Response) => {
      return res.redirect(`/${API_DOCS_PATH}`);
    });

    const config = new DocumentBuilder()
      .setTitle('SHAVARCHALA SHANTI SANGHA Server API')
      .setDescription('SHAVARCHALA SHANTI SANGHA Server API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(API_DOCS_PATH, app, documentFactory);

    await app.listen(port);
    logger.log(
      `🚀 SHAVARCHALA SHANTI SANGHA Server running on http://localhost:${port}`,
      'Bootstrap',
    );
  } catch (error) {
    logger.error(
      'Error during bootstrap:',
      error instanceof Error ? error.stack : String(error),
      'Bootstrap',
    );
  }
}
void bootstrap();
