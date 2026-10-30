import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested,
} from 'class-validator';
import { OrderKind, OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderItemDto {
  @IsString() productId: string;
  @IsString() variantId: string;
  @IsInt() @Min(1) @Max(20) quantity: number;
}

export class CreateOrderDto {
  @IsEnum(OrderKind) kind: OrderKind;

  @IsArray() @ArrayMinSize(1, { message: 'سبد خرید خالی است' })
  @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString({ message: 'روش ارسال را انتخاب کنید' }) shippingCode: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsString() @MinLength(3, { message: 'نام گیرنده را کامل بنویسید' }) receiverName: string;
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل گیرنده درست نیست' }) receiverPhone: string;
  @IsString() @MinLength(2, { message: 'استان را انتخاب کنید' }) province: string;
  @IsString() @MinLength(2, { message: 'نام شهر را بنویسید' }) city: string;
  @Matches(/^\d{10}$/, { message: 'کد پستی ۱۰ رقم است' }) postalCode: string;
  @IsString() @MinLength(10, { message: 'نشانی را کامل‌تر بنویسید' }) addressLine: string;
  @IsOptional() @IsString() note?: string;
}

export class AddItemsDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class CardPaymentDto {
  @IsString({ message: 'عکس فیش را آپلود کنید' }) imageUrl: string;
  @IsInt() @Min(1000, { message: 'مبلغ واریزی را به تومان بنویسید' }) amount: number;
  @IsOptional() @IsString() payerName?: string;
  @IsOptional() @IsString() trackingCode?: string;
  @IsOptional() @IsString() paidAt?: string;
}

export class ReviewPaymentDto {
  @IsEnum(PaymentStatus) status: PaymentStatus;
  @IsOptional() @IsString() adminNote?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'وضعیت سفارش درست نیست' }) status: OrderStatus;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() adminNote?: string;
}

export class ExtendHoldDto {
  @IsInt() @Min(1) @Max(30) days: number;
}
