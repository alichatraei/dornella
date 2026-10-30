import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CouponDto {
  @Matches(/^[A-Za-z0-9_-]{3,20}$/, { message: 'کد تخفیف فقط حروف انگلیسی و عدد، بین ۳ تا ۲۰ کاراکتر' }) code: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(DiscountType) type: DiscountType;
  @IsInt() @Min(1, { message: 'مقدار تخفیف را وارد کنید' }) value: number;
  @IsOptional() @IsInt() @Min(0) maxDiscount?: number;
  @IsOptional() @IsInt() @Min(0) minOrder?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsInt() @Min(1) perUserLimit?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CheckCouponDto {
  @IsString({ message: 'کد تخفیف را وارد کنید' }) code: string;
  @IsInt() @Min(0) subtotal: number;
}
