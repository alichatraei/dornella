import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2, { message: 'نام را کامل بنویسید' }) @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(10) birthDate?: string;
  @IsOptional() @IsString() @MaxLength(40) city?: string;
  @IsOptional() @IsBoolean() smsOptIn?: boolean;
}

export class AddressDto {
  @IsString() @MinLength(3, { message: 'نام گیرنده را کامل بنویسید' }) receiverName: string;
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل گیرنده درست نیست' }) phone: string;
  @IsString() province: string;
  @IsString() @MinLength(2, { message: 'نام شهر را بنویسید' }) city: string;
  @Matches(/^\d{10}$/, { message: 'کد پستی ۱۰ رقم است' }) postalCode: string;
  @IsString() @MinLength(10, { message: 'نشانی را کامل‌تر بنویسید' }) line: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
