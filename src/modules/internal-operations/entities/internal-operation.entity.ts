import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ShiftType {
  MORNING = 'MORNING', // 07:30 - 11:30
  AFTERNOON = 'AFTERNOON', // 13:00 - 17:00
  EVENING = 'EVENING', // 17:30 - 21:00
}

export enum LibraryZone {
  CIRCULATION_DESK = 'CIRCULATION_DESK', // Quầy lưu hành mượn trả
  READING_ROOM = 'READING_ROOM', // Phòng đọc & Tự học tầng 2-3
  STACKS_STORAGE = 'STACKS_STORAGE', // Kho sách mở & Kho lưu trữ
  MULTIMEDIA_ROOM = 'MULTIMEDIA_ROOM', // Phòng Đa phương tiện & E-Library
}

export enum ShiftStatus {
  ASSIGNED = 'ASSIGNED',
  COMPLETED = 'COMPLETED',
  LEAVE_REQUESTED = 'LEAVE_REQUESTED',
  SWAPPED = 'SWAPPED',
}

@Entity('shift_schedules')
export class ShiftSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  shiftDate: string; // YYYY-MM-DD

  @Column({
    type: 'varchar',
    default: ShiftType.MORNING,
  })
  shiftType: ShiftType;

  @Column({
    type: 'varchar',
    default: LibraryZone.CIRCULATION_DESK,
  })
  zone: LibraryZone;

  @Column({ nullable: true })
  staffId: number;

  @Column()
  staffName: string;

  @Column({
    type: 'varchar',
    default: ShiftStatus.ASSIGNED,
  })
  status: ShiftStatus;

  @Column({ nullable: true })
  swapWithStaffName: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum KpiRank {
  EXCELLENT = 'EXCELLENT', // Xuất sắc (>= 90 điểm)
  GOOD = 'GOOD', // Tốt (75 - 89 điểm)
  AVERAGE = 'AVERAGE', // Đạt chuẩn (60 - 74 điểm)
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT', // Cần cải thiện (< 60 điểm)
}

@Entity('staff_kpis')
export class StaffKpi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  staffId: number;

  @Column()
  staffName: string;

  @Column({ default: 'Thủ thư nghiệp vụ' })
  roleTitle: string;

  @Column({ default: '2026-11' })
  monthYear: string; // YYYY-MM

  @Column({ type: 'int', default: 0 })
  catalogedBooksCount: number; // Số đầu sách đã biên mục & dán mã vạch

  @Column({ type: 'int', default: 0 })
  processedLoansCount: number; // Số lượt duyệt mượn / trả sách

  @Column({ type: 'int', default: 0 })
  inventoryAuditsCount: number; // Số lượt quét kiểm kê kho

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 4.8 })
  satisfactionScore: number; // Điểm hài lòng từ phản hồi độc giả (1.0 - 5.0)

  @Column({ type: 'int', default: 85 })
  totalKpiPoints: number; // Tổng điểm KPI quy đổi (thang 100)

  @Column({
    type: 'varchar',
    default: KpiRank.GOOD,
  })
  kpiRank: KpiRank;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

