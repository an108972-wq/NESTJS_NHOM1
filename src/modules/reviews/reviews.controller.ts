import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('book/:bookId')
  findByBook(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.reviewsService.findByBook(bookId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  findAllForStaff() {
    return this.reviewsService.findAllForStaff();
  }

  @Patch(':reviewId/moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  moderate(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.setVisibility(reviewId, dto.isVisible);
  }

  @Post('book/:bookId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES, UserRole.READER)
  create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.create(req.user.userId, bookId, dto);
  }

  @Patch(':reviewId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES, UserRole.READER)
  update(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: UpdateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.update(
      reviewId,
      req.user.userId,
      STAFF_ROLES.includes(req.user.role),
      dto,
    );
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES, UserRole.READER)
  remove(@Param('reviewId', ParseIntPipe) reviewId: number, @Request() req: any) {
    return this.reviewsService.remove(
      reviewId,
      req.user.userId,
      STAFF_ROLES.includes(req.user.role),
    );
  }
}
