import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { LogRepository } from 'src/log/log.repository';
import { LogService } from 'src/log/log.service';
import { PrismaService } from 'src/prisma.service';
import { PatientService } from './patient.service';
import { PatientRepository } from './patient.repository';
import {Crypto} from '../util/crypto.util';

@Module({
    controllers:[PatientController],
    providers: [
        PatientService,
        Crypto,
        LogService,
        LogRepository,
        PrismaService,
        PatientRepository,
        LogService,
        LogRepository
    ]
})
export class PatientModule {}
 