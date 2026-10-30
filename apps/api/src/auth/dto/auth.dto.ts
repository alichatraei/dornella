import { IsBoolean, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class RequestOtpDto {
  @IsString({ message: 'شماره موبایل را وارد کنید' })
  phone: string;
}

export class VerifyOtpDto {
  @IsString() phone: string;
  @IsString() @Length(5, 5, { message: 'کد ۵ رقمی را کامل وارد کنید' }) code: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() smsOptIn?: boolean;
}

export class AdminLoginDto {
  @IsString({ message: 'ایمیل یا شماره موبایل را وارد کنید' }) username: string;
  @IsString() @MinLength(6, { message: 'رمز عبور حداقل ۶ کاراکتر است' }) password: string;
}

export class ChangePasswordDto {
  @IsOptional() @IsString() currentPassword?: string;
  @IsString() @MinLength(8, { message: 'رمز جدید باید حداقل ۸ کاراکتر باشد' }) newPassword: string;
}
