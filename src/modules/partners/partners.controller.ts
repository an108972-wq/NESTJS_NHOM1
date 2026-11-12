import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { STAFF_ROLES } from '../../common/constants/user-role';
import { PartnersService } from './partners.service';
import {
  CreateDonationDto,
  CreatePartnerDto,
  UpdatePartnerDto,
} from './dto/partner.dto';

@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.findAll(type, status, search);
  }

  @Get('stats')
  getStats() {
    return this.partnersService.getStats();
  }

  @Get('donations')
  findAllDonations(
    @Query('partnerId') partnerId?: string,
    @Query('donationType') donationType?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.findAllDonations(
      partnerId ? Number(partnerId) : undefined,
      donationType,
      search,
    );
  }

  @Get('donations/:id/receipt')
  getDonationReceipt(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.getDonationReceipt(id);
  }

  @Post('donations')
  createDonation(@Body() dto: CreateDonationDto, @Request() req: any) {
    const staffName = req.user?.fullName || req.user?.username || 'Thủ thư tiếp nhận';
    return this.partnersService.createDonation(dto, staffName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.remove(id);
  }
}

