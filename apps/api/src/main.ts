import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('در حالت production مقدار JWT_SECRET باید حداقل ۳۲ کاراکتر باشد');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '2mb' });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // در پروداکشن nginx خودش پوشه uploads را سرو می‌کند؛ این مسیر برای توسعه است
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/', maxAge: '30d' });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  new Logger('Dornela').log(`API روی پورت ${port} بالا آمد`);
}
bootstrap();
