import { Global, Module } from '@nestjs/common';
import { FestivalsService } from './festivals.service';
import { FestivalsController } from './festivals.controller';
import { PricingService } from './pricing.service';

@Global()
@Module({ controllers: [FestivalsController], providers: [FestivalsService, PricingService], exports: [PricingService] })
export class FestivalsModule {}
