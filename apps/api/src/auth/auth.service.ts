import {
  BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { isMobile, normalizePhone } from '../common/utils/phone';
import { AdminLoginDto, ChangePasswordDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';

const OTP_TTL = 2 * 60 * 1000;
const OTP_RESEND_GAP = 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private sms: SmsService) {}

  private sign(user: { id: string; role: string; phone: string }) {
    return this.jwt.signAsync({ id: user.id, role: user.role, phone: user.phone });
  }

  async requestOtp(dto: RequestOtpDto) {
    const phone = normalizePhone(dto.phone);
    if (!isMobile(phone)) throw new BadRequestException('شماره موبایل درست نیست. مثل ۰۹۱۲۱۲۳۴۵۶۷ بنویسید');

    const last = await this.prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
    if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_GAP) {
      const wait = Math.ceil((OTP_RESEND_GAP - (Date.now() - last.createdAt.getTime())) / 1000);
      throw new HttpException(`کد قبلی هنوز معتبر است. ${wait} ثانیه دیگر دوباره امتحان کنید`, HttpStatus.TOO_MANY_REQUESTS);
    }
    const lastHour = await this.prisma.otpCode.count({
      where: { phone, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    });
    if (lastHour >= 6) {
      throw new HttpException('تعداد درخواست کد زیاد شد. یک ساعت دیگر امتحان کنید', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(10000, 99999));
    await this.prisma.otpCode.create({
      data: { phone, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + OTP_TTL) },
    });
    const sent = await this.sms.sendOtp(phone, code);
    if (!sent.ok) throw new BadRequestException('ارسال پیامک انجام نشد. چند دقیقه دیگر دوباره امتحان کنید');

    const exists = await this.prisma.user.findUnique({ where: { phone }, select: { name: true } });
    return {
      phone,
      expiresIn: OTP_TTL / 1000,
      isNew: !exists?.name,
      // فقط در حالت توسعه، کد برای راحتی تست برگردانده می‌شود
      ...(process.env.NODE_ENV !== 'production' && !this.sms.enabled ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = normalizePhone(dto.phone);
    const code = normalizePhone(dto.code);
    const otp = await this.prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });

    if (!otp || otp.expiresAt < new Date()) throw new BadRequestException('کد منقضی شده است. کد جدید بگیرید');
    if (otp.attempts >= 5) throw new BadRequestException('چند بار کد اشتباه وارد شد. کد جدید بگیرید');
    if (!(await bcrypt.compare(code, otp.codeHash))) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('کد وارد شده درست نیست');
    }
    await this.prisma.otpCode.deleteMany({ where: { phone } });

    const name = dto.name?.trim() || undefined;
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, name, smsOptIn: dto.smsOptIn ?? true, isClubMember: true, lastLoginAt: new Date() },
      });
    } else {
      if (!user.isActive) throw new UnauthorizedException('این حساب غیرفعال شده است. با پشتیبانی تماس بگیرید');
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), ...(name && !user.name ? { name } : {}) },
      });
    }
    return { token: await this.sign(user), user: this.publicUser(user) };
  }

  async adminLogin(dto: AdminLoginDto) {
    const username = dto.username.trim().toLowerCase();
    const phone = normalizePhone(username);
    const user = await this.prisma.user.findFirst({
      where: isMobile(phone) ? { phone } : { email: username },
    });
    if (!user || !user.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور درست نیست');
    }
    if (user.role !== 'ADMIN') throw new UnauthorizedException('این حساب دسترسی مدیریت ندارد');
    if (!user.isActive) throw new UnauthorizedException('این حساب غیرفعال شده است');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { token: await this.sign(user), user: this.publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.passwordHash && !(await bcrypt.compare(dto.currentPassword || '', user.passwordHash))) {
      throw new BadRequestException('رمز فعلی درست نیست');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { message: 'رمز عبور عوض شد' };
  }

  private publicUser(u: any) {
    const { passwordHash, adminNote, tags, ...rest } = u;
    return { ...rest, hasPassword: !!passwordHash };
  }
}
