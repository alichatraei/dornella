import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { ShippingScope } from '@prisma/client';

export class ShippingMethodDto {
  @Matches(/^[a-z0-9_-]{2,30}$/, { message: 'کد روش ارسال فقط حروف کوچک انگلیسی و عدد' }) code: string;
  @IsString() @MinLength(2) title: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(0, { message: 'هزینه ارسال نمی‌تواند منفی باشد' }) cost: number;
  @IsEnum(ShippingScope) scope: ShippingScope;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}
