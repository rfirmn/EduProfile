import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix: /v1
  const apiPrefix = configService.get<string>('API_PREFIX', 'v1');
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if extra properties sent
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global response interceptor (success envelope)
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter (error envelope)
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('PORT', 3000);
// UBAH DI SINI: Tambahkan '0.0.0.0' sebagai argumen kedua
  await app.listen(port, '0.0.0.0');
  
  // TAMBAHAN (Opsional): Menampilkan IP Lokal di console agar tidak bingung mencari
  const os = await import('os');
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
  }

  console.log(`🚀 VAK Platform API running`);
  console.log(`   - Lokal:   http://localhost:${port}/${apiPrefix}`);
  console.log(`   - Jaringan: http://${localIp}:${port}/${apiPrefix}`); // Ini IP yang dipakai perangkat lain
}
bootstrap();
