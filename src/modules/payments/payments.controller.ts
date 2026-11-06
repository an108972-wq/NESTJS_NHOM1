import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Redirect,
  Req,
  Request,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('fines/:recordId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...COUNTER_ROLES, UserRole.READER)
  createFinePayment(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Request() req: any,
    @Req() rawRequest: { ip?: string; socket?: { remoteAddress?: string } },
  ) {
    return this.paymentsService.createFinePayment(
      recordId,
      req.user.userId,
      req.user.role,
      rawRequest.ip || rawRequest.socket?.remoteAddress || '',
    );
  }

  @Get('vnpay/ipn')
  ipn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleIpn(this.normalizeQuery(query));
  }

  @Get('vnpay/return')
  @Redirect()
  async returnFromVnpay(@Query() query: Record<string, string>) {
    const result = await this.paymentsService.verifyReturn(this.normalizeQuery(query));
    const frontendUrl = process.env.VNPAY_FRONTEND_URL || '/';
    let redirect: URL;
    try {
      redirect = new URL(frontendUrl, process.env.VNPAY_RETURN_URL || 'http://localhost:3000');
      if (!['http:', 'https:'].includes(redirect.protocol) ||
          (process.env.NODE_ENV === 'production' && redirect.protocol !== 'https:')) throw new Error();
    } catch {
      throw new ServiceUnavailableException('VNPAY_FRONTEND_URL phải là URL HTTP(S) hợp lệ');
    }
    redirect.searchParams.set('payment', result);
    return { url: redirect.toString(), statusCode: 302 };
  }

  private normalizeQuery(query: Record<string, string>): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'string') return {};
      params[key] = value;
    }
    return params;
  }
}
