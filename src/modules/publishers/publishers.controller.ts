import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { INVENTORY_ROLES } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { PublishersService } from './publishers.service';

@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.publishersService.findAll(search);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="publishers.csv"')
  async exportCsv(@Res() res: Response) {
    const data = await this.publishersService.exportPublishers();
    const csv = data
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(','),
      )
      .join('\r\n');
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.publishersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  create(@Body() dto: CreatePublisherDto) {
    return this.publishersService.create(dto);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @UseInterceptors(FileInterceptor('file'))
  async importPublishers(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Không có file được tải lên');
    const format = file.originalname.endsWith('.csv') ? 'csv' : 'xlsx';
    return this.publishersService.importPublishers(file.buffer, format);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublisherDto,
  ) {
    return this.publishersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.publishersService.remove(id);
  }
}
