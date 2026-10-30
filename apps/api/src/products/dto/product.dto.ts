import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested,
} from 'class-validator';

export class ProductImageDto {
  @IsString() url: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsInt() position?: number;
}

export class ProductVariantDto {
  @IsOptional() @IsString() id?: string;
  @IsString() size: string;
  @IsString() color: string;
  @IsOptional() @IsString() colorHex?: string;
  @IsInt() @Min(0) stock: number;
  @IsOptional() @IsString() sku?: string;
}

export class CreateProductDto {
  @IsString() @MinLength(2, { message: 'نام محصول را بنویسید' }) title: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsInt() @Min(1000, { message: 'قیمت را به تومان وارد کنید' }) price: number;
  @IsOptional() @IsInt() compareAtPrice?: number;
  @IsOptional() @IsInt() @Min(0) costPrice?: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() collection?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() sizeGuide?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class UpdateProductDto extends CreateProductDto {
  @IsOptional() title: string;
  @IsOptional() price: number;
}

export class BulkProductDto {
  @IsArray() @IsString({ each: true }) ids: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() collection?: string;
  @IsOptional() @IsInt() priceChangePercent?: number;
}

export class ProductQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() collection?: string;
  @IsOptional() @IsString() festival?: string;
  @IsOptional() @IsInt() minPrice?: number;
  @IsOptional() @IsInt() maxPrice?: number;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() sort?: 'newest' | 'cheapest' | 'expensive' | 'popular';
  @IsOptional() @IsInt() page?: number;
  @IsOptional() @IsInt() limit?: number;
  @IsOptional() @IsString() featured?: string;
  @IsOptional() @IsString() inStock?: string;
  @IsOptional() @IsString() includeInactive?: string;
}
