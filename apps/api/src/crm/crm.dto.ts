import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class AudienceDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() city?: string;
  /** all | buyers | never | inactive */
  @IsOptional() @IsString() segment?: string;
  @IsOptional() @IsInt() inactiveDays?: number;
  @IsOptional() @IsInt() minSpent?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) ids?: string[];
}

export class CampaignDto {
  @IsString() @MinLength(2, { message: 'یک عنوان برای کمپین بنویسید' }) title: string;
  @IsString() @MinLength(5, { message: 'متن پیامک خیلی کوتاه است' }) @MaxLength(600, { message: 'متن پیامک طولانی است' }) message: string;
  @ValidateNested() @Type(() => AudienceDto) audience: AudienceDto;
}

export class UpdateContactDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() adminNote?: string;
  @IsOptional() @IsBoolean() smsOptIn?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ImportContactsDto {
  @IsString() @MinLength(10) text: string;
  @IsOptional() @IsString() tag?: string;
}
