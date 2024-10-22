import { Module } from '@nestjs/common';
import { DailyDeliveryVolumeService } from './daily-delivery-volume.service';
import { DailyDeliveryVolumeController } from './daily-delivery-volume.controller';
import { PrismaService } from 'src/prisma.service';
import { DailyDeliveryVolumeRepository } from './daily-delivery-volume.repository';

@Module({
  controllers: [DailyDeliveryVolumeController],
  providers: [
    DailyDeliveryVolumeService,
    PrismaService,
    DailyDeliveryVolumeRepository,
  ],
})
export class DailyDeliveryVolumeModule {}
