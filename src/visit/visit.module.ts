import { Module } from '@nestjs/common';
import { VisitController } from './visit.controller';
import { VisitService } from './visit.service';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';
import { PrismaService } from 'src/prisma.service';
import { VisitRepository } from './visit.repository';
import {Crypto} from '../util/crypto.util';
@Module({
    controllers:[VisitController],
    providers: [
        VisitService,
        Crypto,
        LogService,
        LogRepository,
        PrismaService,
        VisitRepository
    ]
})
export class VisitModule {}
