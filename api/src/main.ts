import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const httpsOptions =
    process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH
      ? {
          key: readFileSync(process.env.HTTPS_KEY_PATH),
          cert: readFileSync(process.env.HTTPS_CERT_PATH),
        }
      : undefined;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: [
      'http://192.168.0.100:5173',
      'http://localhost:5173',
      'https://192.168.0.100:5173',
      'https://localhost:5173',
      'http://192.168.0.100:5174',
      'http://localhost:5174',
      'https://192.168.0.100:5174',
      'https://localhost:5174',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  console.log(
    `API running on ${httpsOptions ? 'https' : 'http'}://192.168.0.100:${process.env.PORT ?? 3000}`,
  );
}

bootstrap();
