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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

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

  await app.listen(3000);
  console.log(`Server running on: http://localhost:3000`);
  console.log(`Swagger Docs available at: http://localhost:3000/api/docs`);
}
bootstrap();