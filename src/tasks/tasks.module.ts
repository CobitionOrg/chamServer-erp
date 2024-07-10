import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { PrismaService } from 'src/prisma.service';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';
import { ErpService } from 'src/erp/erp.service';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from 'src/admin/admin.service';
import { Crypto } from 'src/util/crypto.util';
import { UserService } from 'src/user/user.service';

@Module({
    providers:[TasksService,TasksRepository,PrismaService,LogService,
        LogRepository,]
})
export class TasksModule {}
