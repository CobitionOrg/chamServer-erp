import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { PrismaService } from 'src/prisma.service';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';
import { Crypto } from 'src/util/crypto.util';
import { HolidayService } from 'src/holiday/holiday.service';
import { HolidayRepository } from 'src/holiday/holiday.repository';
import { PatientRepository } from 'src/patient/patient.repository';
import { AdminService } from 'src/admin/admin.service';
import { AdminRepository } from 'src/admin/admin.repository';
import { UserService } from 'src/user/user.service';
import { ErpService } from 'src/erp/erp.service';

@Module({
    providers: [
        TasksService,
        TasksRepository,
        PrismaService,
        LogService,
        LogRepository,
        Crypto,
        HolidayService,
        HolidayRepository,
        ErpService,
        PatientRepository,
        AdminService,
        AdminRepository,
        UserService,
    ],
})
export class TasksModule {}
