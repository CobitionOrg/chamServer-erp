import {
  Body,
  Controller,
  Get,
  Logger,
  Patch,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { DailyDeliveryVolumeService } from './daily-delivery-volume.service';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatchDeliveryVolumeDto } from './Dto/patchDeliveryVolume.dto';

@Controller('daily-delivery-volume')
@UseFilters(new HttpExceptionFilter())
// @UseGuards(AuthGuard)
@ApiTags('daily deilvery volume api')
export class DailyDeliveryVolumeController {
  constructor(
    private readonly dailyDeliveryVolumeService: DailyDeliveryVolumeService,
  ) {}

  private readonly logger = new Logger(DailyDeliveryVolumeController.name);

  @ApiOperation({ summary: '요일별 발송량 전체 조회' })
  @Get('/')
  async getAllDeliveryVolume() {
    this.logger.log('요일별 발송량 전체 조회');
    return await this.dailyDeliveryVolumeService.getAllDeliveryVolume();
  }

  @ApiOperation({ summary: '요일별 발송량 전체 수정' })
  @Patch('/')
  async patchAllDeliveryVolume(
    @Body() patchDeliveryVolumeDto: PatchDeliveryVolumeDto,
  ) {
    this.logger.log('요일별 발송량 전체 수정');
    return await this.dailyDeliveryVolumeService.patchChangedDeliveryVolume(
      patchDeliveryVolumeDto,
    );
  }
}
