import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string = req.headers?.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('برای این بخش باید وارد حساب کاربری شوید');
    try {
      req.user = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET || 'dornela-dev-secret' });
      return true;
    } catch {
      throw new UnauthorizedException('نشست شما منقضی شده است. دوباره وارد شوید');
    }
  }
}
