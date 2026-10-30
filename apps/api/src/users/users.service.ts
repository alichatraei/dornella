import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddressDto, UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    const { passwordHash, adminNote, tags, ...rest } = user;
    return rest;
  }

  addresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  async addAddress(userId: string, dto: AddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault || count === 0;
    if (isDefault) await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.create({ data: { ...dto, isDefault, userId } });
  }

  async removeAddress(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('نشانی پیدا نشد');
    if (address.userId !== userId) throw new ForbiddenException();
    await this.prisma.address.delete({ where: { id } });
    return { message: 'نشانی حذف شد' };
  }
}
