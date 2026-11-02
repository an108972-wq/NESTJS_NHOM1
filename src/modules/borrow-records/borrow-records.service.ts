import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BorrowRecord } from './entities/borrow-record.entity';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BorrowRecordsService {
  private readonly DAILY_FINE_RATE = 5000; // 5.000 VNĐ / ngày quá hạn
  private readonly BORROW_DAYS = 14; // Hạn mượn mặc định 14 ngày

  constructor(
    @InjectRepository(BorrowRecord)
    private readonly borrowRepo: Repository<BorrowRecord>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll() {
    return this.borrowRepo.find({
      relations: { user: true, book: true },
      order: { id: 'DESC' },
    });
  }

  async borrowBook(userId: number, bookId: number) {
    // Chặn mượn nếu người dùng đang nợ tiền phạt chưa trả
    const unpaidRecord = await this.borrowRepo.findOne({
      where: { user: { id: userId }, fineStatus: 'UNPAID' },
    });
    if (unpaidRecord) {
      throw new BadRequestException('Bạn đang có tiền phạt chưa thanh toán. Vui lòng nộp phạt trước khi mượn sách tiếp!');
    }

    const book = await this.bookRepo.findOneBy({ id: bookId });
    if (!book) throw new NotFoundException('Không tìm thấy sách');
    if (book.availableCopies <= 0) throw new BadRequestException('Sách đã hết lượt mượn');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Tự động tính hạn trả (14 ngày sau)
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + this.BORROW_DAYS);

    book.availableCopies -= 1;
    await this.bookRepo.save(book);

    const record = this.borrowRepo.create({
      user,
      book,
      dueDate,
      status: 'BORROWED',
      fineAmount: 0,
      fineStatus: 'NONE',
    });
    return this.borrowRepo.save(record);
  }

  async returnBook(recordId: number) {
    const record = await this.borrowRepo.findOne({
      where: { id: recordId },
      relations: { book: true },
    });

    if (!record) throw new NotFoundException('Không tìm thấy bản ghi mượn sách');
    if (record.status === 'RETURNED') throw new BadRequestException('Sách đã được trả trước đó');

    const returnDate = new Date();
    record.status = 'RETURNED';
    record.returnedAt = returnDate;

    // Tính tiền phạt nếu ngày trả muộn hơn hạn trả (dueDate)
    const dueDate = new Date(record.dueDate);
    if (returnDate > dueDate) {
      const diffTime = Math.abs(returnDate.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      record.fineAmount = diffDays * this.DAILY_FINE_RATE;
      record.fineStatus = 'UNPAID';
    }

    record.book.availableCopies += 1;
    await this.bookRepo.save(record.book);

    return this.borrowRepo.save(record);
  }

  async payFine(recordId: number) {
    const record = await this.borrowRepo.findOneBy({ id: recordId });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi');
    if (record.fineStatus !== 'UNPAID') {
      throw new BadRequestException('Bản ghi này không có tiền phạt cần thanh toán');
    }

    record.fineStatus = 'PAID';
    return this.borrowRepo.save(record);
  }
}