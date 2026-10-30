import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AddressDto, UpdateProfileDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  @Patch('me')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(userId, dto);
  }

  @Get('me/addresses')
  addresses(@CurrentUser('id') userId: string) {
    return this.service.addresses(userId);
  }

  @Post('me/addresses')
  addAddress(@CurrentUser('id') userId: string, @Body() dto: AddressDto) {
    return this.service.addAddress(userId, dto);
  }

  @Delete('me/addresses/:id')
  removeAddress(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.removeAddress(userId, id);
  }
}
