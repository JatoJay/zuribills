import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  app.use(json({ limit: '1mb' }));
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT) || 8787;
  await app.listen(port);
  console.log(`[api] listening on ${port}`);
};

bootstrap();
