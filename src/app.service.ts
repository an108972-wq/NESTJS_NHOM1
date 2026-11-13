import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(@Optional() private readonly dataSource?: DataSource) {}

  async onModuleInit() {
    if (!this.dataSource) return;
    try {
      // 1. Chuẩn hóa tên tài khoản độc giả test "he" -> "Nguyễn Văn Minh"
      await this.dataSource.query(
        "UPDATE `users` SET `fullName` = 'Nguyễn Văn Minh' WHERE LOWER(TRIM(`fullName`)) = 'he' OR LOWER(TRIM(`username`)) = 'he'",
      );

      // 2. Chuẩn hóa danh mục "hài" -> "Văn học hài hước & Châm biếm"
      await this.dataSource.query(
        "UPDATE `categories` SET `name` = 'Văn học hài hước & Châm biếm', `description` = 'Tuyển tập các tác phẩm văn học châm biếm, trào phúng và hài hước kinh điển' WHERE LOWER(TRIM(`name`)) = 'hài' OR LOWER(TRIM(`name`)) = 'hai' OR LOWER(TRIM(`name`)) LIKE '%hài%'",
      );
    } catch {
      // Bỏ qua nếu bảng chưa sẵn sàng
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
