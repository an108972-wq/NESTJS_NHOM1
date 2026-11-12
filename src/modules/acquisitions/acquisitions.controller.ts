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
import { INVENTORY_ROLES, ALL_ROLES } from '../../common/constants/user-role';
import { AcquisitionsService } from './acquisitions.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';

@Controller('acquisitions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcquisitionsController {
  constructor(private readonly acquisitionsService: AcquisitionsService) {}

  @Post()
  @Roles(...ALL_ROLES)
  create(@Request() req: any, @Body() dto: CreatePurchaseRequestDto) {
    return this.acquisitionsService.create(req.user, dto);
  }

  @Get()
  @Roles(...INVENTORY_ROLES)
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Request() req?: any,
  ) {
    return this.acquisitionsService.findAll(status, search, sortBy, req?.user?.id);
  }

  @Get('my')
  @Roles(...ALL_ROLES)
  findMy(@Request() req: any) {
    return this.acquisitionsService.findMy(req.user.id);
  }

  @Get('opac-feed')
  @Roles(...ALL_ROLES)
  getOpacFeed(@Request() req: any) {
    return this.acquisitionsService.getOpacFeed(req?.user?.id || req?.user?.userId);
  }

  @Post(':id/approve-stage')
  @Roles(...INVENTORY_ROLES)
  approveStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
    @Request() req: any,
  ) {
    return this.acquisitionsService.advanceApprovalStage(id, req.user, body?.note);
  }

  @Post(':id/reject-stage')
  @Roles(...INVENTORY_ROLES)
  rejectStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.acquisitionsService.rejectRequest(id, req.user, body?.reason);
  }

  @Get('approved-groups')
  @Roles(...INVENTORY_ROLES)
  getApprovedGroups() {
    return this.acquisitionsService.getApprovedGroups();
  }

  @Get('budget')
  @Roles(...INVENTORY_ROLES)
  getBudget(@Query('year') year?: number) {
    return this.acquisitionsService.getBudget(year ? Number(year) : new Date().getFullYear());
  }

  @Post('budget')
  @Roles(...INVENTORY_ROLES)
  saveBudget(@Body() body: any) {
    return this.acquisitionsService.saveBudget(body);
  }

  @Get('orders')
  @Roles(...INVENTORY_ROLES)
  findAllOrders(@Query('status') status?: string) {
    return this.acquisitionsService.findAllOrders(status);
  }

  @Post('orders')
  @Roles(...INVENTORY_ROLES)
  createOrder(@Request() req: any, @Body() data: any) {
    return this.acquisitionsService.createOrder({
      ...data,
      createdByName: req.user?.fullName || req.user?.username,
    });
  }

  @Get('orders/:id')
  @Roles(...INVENTORY_ROLES)
  findOrder(@Param('id', ParseIntPipe) id: number) {
    return this.acquisitionsService.findOrder(id);
  }

  @Patch('orders/:id/status')
  @Roles(...INVENTORY_ROLES)
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: any; note?: string },
  ) {
    return this.acquisitionsService.updateOrderStatus(id, body.status, body.note);
  }

  @Delete('orders/:id')
  @Roles(...INVENTORY_ROLES)
  removeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.acquisitionsService.removeOrder(id);
  }

  @Post(':id/vote')
  @Roles(...ALL_ROLES)
  toggleVote(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.acquisitionsService.toggleVote(id, req.user);
  }

  @Get(':id')
  @Roles(...INVENTORY_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.acquisitionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(...INVENTORY_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.acquisitionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...INVENTORY_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.acquisitionsService.remove(id);
  }
}
