import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class FestivalDto {
  @IsString() @MinLength(3, { message: 'عنوان جشنواره را بنویسید' }) title: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() bannerText?: string;
  @IsInt() @Min(1, { message: 'درصد تخفیف باید بین ۱ تا ۹۰ باشد' }) @Max(90, { message: 'درصد تخفیف باید بین ۱ تا ۹۰ باشد' }) percent: number;
  @IsDateString({}, { message: 'تاریخ شروع درست نیست' }) startsAt: string;
  @IsDateString({}, { message: 'تاریخ پایان درست نیست' }) endsAt: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() allProducts?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
}
