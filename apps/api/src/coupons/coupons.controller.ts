import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CheckCouponDto, CouponDto } from './coupon.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponsController {
  constructor(private service: CouponsService) {}

  @Post('check')
  async check(@CurrentUser('id') userId: string, @Body() dto: CheckCouponDto) {
    const { coupon, discount } = await this.service.evaluate(dto.code, dto.subtotal, userId);
    return { code: coupon.code, discount, description: coupon.description };
  }

  @Get()
  @Roles('ADMIN')
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CouponDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: CouponDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
