import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { SmsModule } from './sms/sms.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { FestivalsModule } from './festivals/festivals.module';
import { ProductsModule } from './products/products.module';
import { CouponsModule } from './coupons/coupons.module';
import { ShippingModule } from './shipping/shipping.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReportsModule } from './reports/reports.module';
import { CrmModule } from './crm/crm.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SettingsModule,
    SmsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    FestivalsModule,
    ProductsModule,
    CouponsModule,
    ShippingModule,
    OrdersModule,
    PaymentsModule,
    UploadsModule,
    ReportsModule,
    CrmModule,
    BootstrapModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
