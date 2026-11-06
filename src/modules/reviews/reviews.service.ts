import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Book) private readonly bookRepository: Repository<Book>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findByBook(bookId: number) {
    const book = await this.bookRepository.findOneBy({ id: bookId });
    if (!book) throw new NotFoundException('Không tìm thấy sách');
    const [reviews, average] = await Promise.all([
      this.reviewRepository
        .createQueryBuilder('review')
        .leftJoin('review.user', 'user')
        .select([
          'review.id',
          'review.rating',
          'review.comment',
          'review.createdAt',
          'user.id',
          'user.username',
        ])
        .where('review.book.id = :bookId AND review.isVisible = :isVisible', {
          bookId,
          isVisible: true,
        })
        .orderBy('review.createdAt', 'DESC')
        .getMany(),
      this.reviewRepository
        .createQueryBuilder('review')
        .select('AVG(review.rating)', 'average')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.book.id = :bookId AND review.isVisible = :isVisible', {
          bookId,
          isVisible: true,
        })
        .getRawOne(),
    ]);
    return {
      averageRating: Number(average?.average ?? 0),
      reviewCount: Number(average?.count ?? 0),
      reviews,
    };
  }

  findAllForStaff() {
    return this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.user', 'user')
      .leftJoin('review.book', 'book')
      .select([
        'review.id',
        'review.rating',
        'review.comment',
        'review.isVisible',
        'review.createdAt',
        'user.id',
        'user.username',
        'book.id',
        'book.title',
      ])
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }

  async setVisibility(reviewId: number, isVisible: boolean) {
    const review = await this.getReview(reviewId);
    review.isVisible = isVisible;
    return this.reviewRepository.save(review);
  }

  async create(userId: number, bookId: number, dto: CreateReviewDto) {
    const [user, book, existingReview] = await Promise.all([
      this.userRepository.findOneBy({ id: userId, isActive: true }),
      this.bookRepository.findOneBy({ id: bookId }),
      this.reviewRepository.findOne({
        where: { user: { id: userId }, book: { id: bookId } },
      }),
    ]);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng đang hoạt động');
    if (!book) throw new NotFoundException('Không tìm thấy sách');
    if (existingReview) throw new BadRequestException('Bạn đã đánh giá đầu sách này');

    return this.reviewRepository.save(this.reviewRepository.create({ ...dto, user, book }));
  }

  async update(reviewId: number, userId: number, isStaff: boolean, dto: UpdateReviewDto) {
    const review = await this.getReview(reviewId);
    this.assertOwnerOrStaff(review, userId, isStaff);
    Object.assign(review, dto);
    return this.reviewRepository.save(review);
  }

  async remove(reviewId: number, userId: number, isStaff: boolean) {
    const review = await this.getReview(reviewId);
    this.assertOwnerOrStaff(review, userId, isStaff);
    await this.reviewRepository.remove(review);
    return { message: 'Đã xóa đánh giá' };
  }

  private async getReview(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return review;
  }

  private assertOwnerOrStaff(review: Review, userId: number, isStaff: boolean) {
    if (!isStaff && review.user.id !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa đánh giá của mình');
    }
  }
}
