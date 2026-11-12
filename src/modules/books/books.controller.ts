import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
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
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, INVENTORY_ROLES, STAFF_ROLES } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateBookCopyDto } from './dto/update-book-copy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BooksService } from './books.service';
import { BookCopyStatus } from './entities/book-copy.entity';

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


  
  @Get('digital')
  getDigitalBooks() {
    return this.booksService.getDigitalBooks();
  }

  @Get('shelves')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getShelves() {
    return this.booksService.getShelvesSummary();
  }

  @Get('shelves/books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getBooksOnShelf(
    @Query('floor') floor?: string,
    @Query('aisle') aisle?: string,
    @Query('shelf') shelf?: string,
    @Query('id') id?: string,
    @Query('bookId') bookId?: string,
  ) {
    const targetBookId = Number(id || bookId) || undefined;
    return this.booksService.getBooksOnShelf(floor, aisle, shelf, targetBookId);
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


  @Get('favorites/my')
  @UseGuards(JwtAuthGuard)
  getMyFavorites(@Request() req: any) {
    return this.booksService.getMyFavorites(req.user.id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  toggleFavorite(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.booksService.toggleFavorite(id, req.user.id);
  }

  @Get(':id/related')
  getRelatedBooks(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.getRelatedBooks(id);
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

  @Post('upload-pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadPdf(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file PDF hoặc EPUB');
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'epub'].includes(ext)) {
      throw new BadRequestException('Chỉ chấp nhận file định dạng .pdf hoặc .epub');
    }
    const filename = `ebook-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'pdf');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = join(uploadDir, filename);
    writeFileSync(filePath, file.buffer);
    return {
      message: 'Tải lên tài liệu số thành công',
      pdfUrl: `/uploads/pdf/${filename}`,
      fileName: file.originalname,
      fileSize: file.buffer.length,
      fileType: ext,
    };
  }

  @Post(':id/digital-view')
  recordDigitalView(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.recordDigitalView(id);
  }

  @Post(':id/digital-download')
  recordDigitalDownload(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const isReader = !!req.user;
    return this.booksService.recordDigitalDownload(id, isReader);
  }

  @Post('upload-cover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadCover(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file hình ảnh bìa sách');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      throw new BadRequestException('Chỉ chấp nhận file hình ảnh định dạng JPG, PNG hoặc WEBP');
    }
    const filename = `cover-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'covers');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = join(uploadDir, filename);
    writeFileSync(filePath, file.buffer);
    return {
      message: 'Tải lên ảnh bìa thành công',
      coverUrl: `/uploads/covers/${filename}`,
    };
  }

  @Post('audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  runAudit(
    @Body()
    dto: { floor?: string; aisle?: string; shelf?: string; scannedBarcodes: string[] },
  ) {
    return this.booksService.runInventoryAudit(dto);
  }

  @Post('audit/bulk-update-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  bulkUpdateAuditStatus(
    @Body()
    dto: { barcodes: string[]; status: BookCopyStatus; reason?: string },
  ) {
    return this.booksService.bulkUpdateAuditCopies(dto);
  }

  @Post('audit/relocate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  relocateAuditCopies(
    @Body()
    dto: { barcodes: string[]; floor?: string; aisle?: string; shelf?: string },
  ) {
    return this.booksService.relocateAuditCopies(dto);
  }

}
