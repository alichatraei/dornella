import {
  BadRequestException, Controller, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const ROOT = join(process.cwd(), 'uploads');

const filter = (allowPdf: boolean) => (_req: any, file: Express.Multer.File, cb: any) => {
  const ext = extname(file.originalname).toLowerCase();
  if (IMAGE_EXT.includes(ext) || (allowPdf && ext === '.pdf')) return cb(null, true);
  cb(new BadRequestException(allowPdf ? 'فقط عکس یا فایل pdf' : 'فقط فایل عکس (jpg، png، webp)'), false);
};

/** عکس‌ها به webp با حداکثر عرض مشخص تبدیل می‌شوند تا سایت سبک بماند */
async function save(folder: string, file: Express.Multer.File, maxWidth: number) {
  const dir = join(ROOT, folder);
  mkdirSync(dir, { recursive: true });
  const id = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;

  if (extname(file.originalname).toLowerCase() === '.pdf') {
    await writeFile(join(dir, `${id}.pdf`), file.buffer);
    return { url: `/uploads/${folder}/${id}.pdf` };
  }
  try {
    const out = await sharp(file.buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(join(dir, `${id}.webp`), out);
    return { url: `/uploads/${folder}/${id}.webp` };
  } catch {
    throw new BadRequestException(`فایل «${file.originalname}» عکس سالم نیست`);
  }
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  @Post('receipt')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), fileFilter: filter(true), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایلی انتخاب نشده است');
    return save('receipts', file, 1400);
  }

  @Post('product')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), fileFilter: filter(false), limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایلی انتخاب نشده است');
    return save('products', file, 1600);
  }

  @Post('products')
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('files', 30, { storage: memoryStorage(), fileFilter: filter(false), limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadProductImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('فایلی انتخاب نشده است');
    const results = [];
    for (const f of files) results.push({ name: f.originalname, ...(await save('products', f, 1600)) });
    return results;
  }
}
