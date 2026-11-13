import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SeminarStatus {
  UPCOMING = 'UPCOMING',
  HAPPENING = 'HAPPENING',
  ENDED = 'ENDED',
}

@Entity('academic_seminars')
export class Seminar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  theme: string; // Tọa đàm tác giả, Nghiên cứu khoa học, Giới thiệu sách mới

  @Column()
  speakerNames: string; // Tên các diễn giả

  @Column({ default: 'Hội trường Đa năng - Tầng 4 Thư viện' })
  location: string;

  @Column({ type: 'datetime' })
  eventDate: Date;

  @Column({ type: 'int', default: 90 })
  durationMinutes: number;

  @Column({ type: 'int', default: 100 })
  maxSeats: number;

  @Column({ type: 'int', default: 0 })
  registeredSeats: number;

  @Column({
    type: 'varchar',
    default: SeminarStatus.UPCOMING,
  })
  status: SeminarStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  attendanceListJson: string; // Danh sách người tham dự & điểm danh (JSON)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum ExchangeGrantType {
  BOOK_EXCHANGE = 'BOOK_EXCHANGE',
  READING_GRANT = 'READING_GRANT',
}

@Entity('exchange_grants')
export class ExchangeGrant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    default: ExchangeGrantType.BOOK_EXCHANGE,
  })
  programType: ExchangeGrantType; // BOOK_EXCHANGE, READING_GRANT

  @Column()
  title: string; // Tên chương trình trao đổi hoặc học bổng

  @Column()
  partnerInstitution: string; // Đại học đối tác / Quỹ tài trợ (VD: Đại học Quốc gia Singapore NUS)

  @Column({ nullable: true })
  country: string; // Singapore, Nhật Bản, Việt Nam...

  @Column({ type: 'int', default: 0 })
  bookQuantity: number; // Số lượng sách gửi / nhận trao đổi

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grantAmount: number; // Tổng giá trị học bổng tài trợ

  @Column({ type: 'int', default: 0 })
  beneficiariesCount: number; // Số sinh viên / độc giả thụ hưởng

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, COMPLETED, PENDING

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate: Date;
}

