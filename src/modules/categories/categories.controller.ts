import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { INVENTORY_ROLES } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { MergeCategoriesDto } from './dto/merge-categories.dto.js';
import { MoveBooksCategoryDto } from './dto/move-books.dto.js';
import { Request } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importCategories(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp CSV hoặc XLSX');
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'xlsx') {
      throw new BadRequestException('Chỉ chấp nhận tệp CSV hoặc XLSX');
    }
    return this.categoriesService.importCategories(file.buffer, extension);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  mergeCategories(@Body() dto: MergeCategoriesDto, @Request() req: any) {
    return this.categoriesService.mergeCategories(dto, req.user);
  }

  @Post(':id/move-books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  moveBooks(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveBooksCategoryDto,
    @Request() req: any,
  ) {
    return this.categoriesService.moveBooks(id, dto.targetCategoryId, req.user);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.categoriesService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
