import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ThesisSecurityStatus {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  RESTRICTED = 'RESTRICTED',
}

@Entity('theses')
export class Thesis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // VD: LV-2025-CNTT-001

  @Column()
  title: string;

  @Column()
  authorName: string; // Tên học viên / sinh viên

  @Column({ nullable: true })
  studentId: string; // MSSV

  @Column()
  advisorName: string; // Giảng viên hướng dẫn

  @Column()
  major: string; // Chuyên ngành: CNTT, Khoa học dữ liệu, Quản trị kinh doanh, Cơ điện tử...

  @Column({ type: 'int', default: 2025 })
  defenseYear: number; // Năm bảo vệ

  @Column({
    type: 'varchar',
    default: ThesisSecurityStatus.PUBLIC,
  })
  securityStatus: ThesisSecurityStatus; // PUBLIC, INTERNAL, RESTRICTED

  @Column({ nullable: true })
  fileUrl: string; // Link file PDF

  @Column({ type: 'text', nullable: true })
  abstract: string; // Tóm tắt đề tài

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum MultimediaCondition {
  GOOD = 'GOOD',
  NEED_DIGITIZATION = 'NEED_DIGITIZATION',
  DAMAGED = 'DAMAGED',
}

export enum MultimediaType {
  CD_DVD = 'CD_DVD',
  CASSETTE = 'CASSETTE',
  MAP = 'MAP',
  HISTORIC_PHOTO = 'HISTORIC_PHOTO',
  OTHER = 'OTHER',
}

@Entity('multimedia_items')
export class MultimediaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // VD: MM-CD-001

  @Column()
  title: string;

  @Column({
    type: 'varchar',
    default: MultimediaType.CD_DVD,
  })
  type: MultimediaType;

  @Column({ nullable: true })
  location: string; // Tủ tư liệu đặc biệt A2

  @Column({
    type: 'varchar',
    default: MultimediaCondition.GOOD,
  })
  condition: MultimediaCondition;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  onSiteLoanCount: number; // Lượt mượn đọc/nghe nhìn tại chỗ

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  digitalFileUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

