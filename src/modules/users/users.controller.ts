import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(...COUNTER_ROLES)
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    if (
      req.user.role !== UserRole.ADMIN &&
      createUserDto.role !== undefined &&
      createUserDto.role !== UserRole.READER
    ) {
      throw new ForbiddenException('Chỉ Admin có thể cấp quyền nhân viên');
    }
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(...COUNTER_ROLES)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id/history')
  async findBorrowHistory(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    if (!COUNTER_ROLES.includes(req.user.role) && req.user.userId !== id) {
      throw new ForbiddenException('Bạn không có quyền xem lịch sử mượn của người dùng này');
    }
    return this.usersService.findBorrowHistory(id);
  }

  @Get(':id/profile')
  async findProfile(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    if (!COUNTER_ROLES.includes(req.user.role) && req.user.userId !== id) {
      throw new ForbiddenException('Bạn chỉ có thể xem hồ sơ của mình');
    }
    return this.usersService.findProfile(id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    if (!COUNTER_ROLES.includes(req.user.role) && req.user.userId !== id) {
      throw new ForbiddenException('Bạn chỉ có thể xem hồ sơ của mình');
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(...COUNTER_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    if (req.user.role !== UserRole.ADMIN && updateUserDto.role !== undefined) {
      throw new ForbiddenException('Chỉ Admin có thể thay đổi vai trò');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @Roles(...COUNTER_ROLES)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @Roles(...COUNTER_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
