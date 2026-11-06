import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('library_settings')
export class LibrarySettings {
  @PrimaryColumn({ type: 'tinyint', default: 1 })
  id: number;

  @Column({ type: 'int', default: 5 })
  maxActiveLoans: number;

  @Column({ type: 'int', default: 14 })
  borrowDays: number;

  @Column({ type: 'int', default: 14 })
  renewalDays: number;

  @Column({ type: 'int', default: 5000 })
  dailyFineRate: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
