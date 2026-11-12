import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { OcrBookDto } from './dto/ocr-book.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { INVENTORY_ROLES, STAFF_ROLES } from '../../common/constants/user-role';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 1. RAG CHATBOT TRA CỨU & TƯ VẤN SÁCH
  @Post('chat')
  chat(@Body() dto: AiChatDto, @Request() req: any) {
    return this.aiService.chat(dto, req.user);
  }

  // 2. GỢI Ý SÁCH CÁ NHÂN HÓA CHO ĐỘC GIẢ
  @Get('recommendations')
  getRecommendations(@Request() req: any) {
    const userId = req.user?.id;
    return this.aiService.getPersonalizedRecommendations(userId);
  }

  // 3. OCR NHẬN DIỆN & TRÍCH XUẤT THÔNG TIN SÁCH TỪ ẢNH BÌA / ISBN
  @Post('ocr-book')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...INVENTORY_ROLES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  ocrExtractBook(
    @UploadedFile() file?: { originalname: string; buffer: Buffer },
    @Body() dto?: OcrBookDto,
  ) {
    return this.aiService.ocrExtractBook(file, dto?.rawText);
  }

  // 4. DỰ BÁO NHU CẦU MƯỢN & ĐỀ XUẤT PHÂN BỔ NGÂN SÁCH
  @Get('budget-demand-forecast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getBudgetDemandForecast(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : 2026;
    return this.aiService.getBudgetDemandForecast(y);
  }
}

