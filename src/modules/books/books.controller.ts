import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, INVENTORY_ROLES } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateBookCopyDto } from './dto/update-book-copy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importBooks(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp CSV hoặc XLSX');
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'xlsx') {
      throw new BadRequestException('Chỉ chấp nhận tệp CSV hoặc XLSX');
    }
    return this.booksService.importBooks(file.buffer, extension);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit = 5,
    @Query('search') search = '',
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('availability') availability?: 'available' | 'unavailable',
  ) {
    return this.booksService.findAll(page, limit, search, categoryId, availability);
  }

  @Get('search')
  search(
    @Query('keyword') keyword = '',
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('status') status?: 'available' | 'unavailable',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('publicationYear', new ParseIntPipe({ optional: true })) publicationYear?: number,
    @Query('shelf') shelf?: string,
    @Query('floor') floor?: string,
    @Query('aisle') aisle?: string,
  ) {
    if (status && !['available', 'unavailable'].includes(status)) {
      throw new BadRequestException('Trạng thái kho không hợp lệ');
    }
    return this.booksService.findAll(
      page,
      limit,
      keyword,
      categoryId,
      status,
      publicationYear,
      shelf,
      floor,
      aisle,
    );
  }

  @Get('locations')
  findLocations() {
    return this.booksService.findLocations();
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.booksService.findByBarcode(barcode);
  }

  @Get(':id/copies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  findCopies(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findCopies(id);
  }

  @Get(':id/copies/labels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  getCopyLabels(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.getCopyLabels(id);
  }

  @Post(':id/copies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  addCopy(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.addCopy(id);
  }

  @Patch(':id/copies/:copyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES, ...COUNTER_ROLES.filter((role) => !INVENTORY_ROLES.includes(role)))
  updateCopy(
    @Param('id', ParseIntPipe) id: number,
    @Param('copyId', ParseIntPipe) copyId: number,
    @Body() dto: UpdateBookCopyDto,
  ) {
    return this.booksService.updateCopy(id, copyId, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(id, updateBookDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
