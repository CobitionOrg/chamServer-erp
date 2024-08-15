import { Module } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { HolidayController } from './holiday.controller';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';
import { PrismaService } from 'src/prisma.service';
import { HolidayRepository } from './holiday.repository';

@Module({
  controllers: [HolidayController],
  providers: [
    HolidayService,
    HolidayRepository,
    LogService,
    LogRepository,
    PrismaService,
  ],
})
export class HolidayModule {}
