import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  AddItemsDto, CardPaymentDto, CreateOrderDto, ExtendHoldDto, ReviewPaymentDto, UpdateOrderStatusDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.service.create(userId, dto);
  }

  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  @Get('hold')
  activeHold(@CurrentUser('id') userId: string) {
    return this.service.activeHold(userId);
  }

  @Get('admin')
  @Roles('ADMIN')
  adminList(
    @Query('status') status?: OrderStatus,
    @Query('kind') kind?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAllAdmin({ status, kind, search, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Post(':id/items')
  addItems(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: AddItemsDto) {
    return this.service.addItems(id, userId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser('id') userId: string) {
    return this.service.removeItem(id, itemId, userId);
  }

  @Post(':id/close')
  closeHold(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.closeHold(id, userId);
  }

  @Post(':id/payments/card')
  cardPayment(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: CardPaymentDto) {
    return this.service.submitCardPayment(id, userId, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.cancelByUser(id, userId);
  }

  @Patch('payments/:paymentId/review')
  @Roles('ADMIN')
  reviewPayment(@Param('paymentId') paymentId: string, @Body() dto: ReviewPaymentDto) {
    return this.service.reviewPayment(paymentId, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Patch(':id/extend')
  @Roles('ADMIN')
  extend(@Param('id') id: string, @Body() dto: ExtendHoldDto) {
    return this.service.extendHold(id, dto.days);
  }
}
