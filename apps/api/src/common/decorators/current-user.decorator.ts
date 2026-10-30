import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUser = { id: string; role: 'USER' | 'ADMIN'; phone: string };

export const CurrentUser = createParamDecorator((data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user as JwtUser;
  return data ? user?.[data] : user;
});
