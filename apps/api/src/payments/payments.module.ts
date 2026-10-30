import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ZarinpalService } from './zarinpal.service';

@Module({ controllers: [PaymentsController], providers: [ZarinpalService] })
export class PaymentsModule {}
