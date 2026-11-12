import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LibraryTutorial } from './tutorial.entity';
import { User } from '../../users/entities/user.entity';

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  ATTENDED = 'ATTENDED',
  CANCELLED = 'CANCELLED',
}

@Entity('tutorial_registrations')
export class TutorialRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => LibraryTutorial, (tut) => tut.registrations, { onDelete: 'CASCADE' })
  tutorial: LibraryTutorial;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User | null;

  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cardNumber?: string | null;

  @Column({ type: 'varchar', length: 20, default: RegistrationStatus.REGISTERED })
  status: RegistrationStatus;

  @CreateDateColumn()
  createdAt: Date;
}

