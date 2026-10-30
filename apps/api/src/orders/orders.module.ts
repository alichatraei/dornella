import { Global, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersScheduler } from './orders.scheduler';

@Global()
@Module({ controllers: [OrdersController], providers: [OrdersService, OrdersScheduler], exports: [OrdersService] })
export class OrdersModule {}
