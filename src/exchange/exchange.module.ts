import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';
import { PrismaService } from 'src/prisma.service';
import { ExchangeRepository } from './exchange.repository';

@Module({
  controllers:[ExchangeController],
  providers: [
    ExchangeService,
    LogService,
    LogRepository,
    PrismaService,
    ExchangeRepository
  ]
})
export class ExchangeModule {}
