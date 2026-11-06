import * as fs from 'fs';
import * as path from 'path';

// Nạp file .env nếu có
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS cho Frontend static
  app.enableCors();

  // Bật ValidationPipe tự động kiểm tra DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Bật Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Cấu hình Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Library Management System API')
    .setDescription('Hệ thống API Quản lý Thư viện tích hợp Auth & JWT')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on: http://localhost:${port}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
