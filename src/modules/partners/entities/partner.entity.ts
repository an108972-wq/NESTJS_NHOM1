import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PartnerType {
  INDIVIDUAL_ALUMNI = 'INDIVIDUAL_ALUMNI',
  PUBLISHER = 'PUBLISHER',
  ORGANIZATION = 'ORGANIZATION',
  CORPORATION = 'CORPORATION',
  OTHER = 'OTHER',
}

@Entity('library_partners')
export class LibraryPartner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    default: PartnerType.ORGANIZATION,
  })
  type: PartnerType;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'int', default: 0 })
  totalDonatedBooks: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDonatedCash: number;

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, INACTIVE

  @Column({ type: 'text', nullable: true })
  note: string;

  @OneToMany(() => BookDonation, (donation) => donation.partner)
  donations: BookDonation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum DonationType {
  BOOKS = 'BOOKS',
  CASH = 'CASH',
  EQUIPMENT = 'EQUIPMENT',
}

@Entity('book_donations')
export class BookDonation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  partnerId: number;

  @Column({ nullable: true })
  partnerName: string;

  @Column({
    type: 'varchar',
    default: DonationType.BOOKS,
  })
  donationType: DonationType;

  @Column()
  itemTitle: string; // Tiêu đề sách / tên thiết bị / mục đích tài trợ

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  estimatedValue: number;

  @Column({ unique: true })
  receiptNumber: string; // VD: REC-2026-001

  @Column({ nullable: true })
  receivedByStaffName: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  donationDate: Date;

  @Column({ type: 'varchar', nullable: true })
  partner?: any;
}

