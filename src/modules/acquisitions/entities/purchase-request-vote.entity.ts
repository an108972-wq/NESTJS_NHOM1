import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { PurchaseRequest } from './purchase-request.entity';
import { User } from '../../users/entities/user.entity';

@Entity('purchase_request_votes')
@Unique(['request', 'user'])
export class PurchaseRequestVote {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseRequest, { onDelete: 'CASCADE' })
  request: PurchaseRequest;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

