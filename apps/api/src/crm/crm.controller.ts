import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CrmService } from './crm.service';
import { AudienceDto, CampaignDto, ImportContactsDto, UpdateContactDto } from './crm.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CrmController {
  constructor(private service: CrmService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Get('contacts')
  contacts(@Query() q: AudienceDto & { page?: number; limit?: number }) {
    return this.service.contacts(q);
  }

  @Get('contacts/export')
  async export(@Query() q: AudienceDto, @Res() res: Response) {
    const csv = await this.service.exportCsv(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dornela-contacts-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Post('contacts/import')
  import(@Body() dto: ImportContactsDto) {
    return this.service.importContacts(dto);
  }

  @Get('contacts/:id')
  contact(@Param('id') id: string) {
    return this.service.contact(id);
  }

  @Patch('contacts/:id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.service.updateContact(id, dto);
  }

  @Post('audience/preview')
  preview(@Body() dto: AudienceDto) {
    return this.service.preview(dto);
  }

  @Get('campaigns')
  campaigns() {
    return this.service.campaigns();
  }

  @Post('campaigns')
  create(@Body() dto: CampaignDto) {
    return this.service.createCampaign(dto);
  }
}
