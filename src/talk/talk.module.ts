import { Module } from '@nestjs/common';
import { LogService } from 'src/log/log.service';
import { PrismaService } from 'src/prisma.service';
import { TalkService } from './talk.service';
import { TalkRepositoy } from './talk.repository';
import { TalkController } from './talk.controller';
import { ErpService } from 'src/erp/erp.service';
import { AdminService } from 'src/admin/admin.service';
import { UserService } from 'src/user/user.service';
import { Crypto } from 'src/util/crypto.util';
import { LogRepository } from 'src/log/log.repository';

@Module({
    providers:[
        PrismaService,
        TalkService,
        TalkRepositoy,
        ErpService,
        AdminService,
        UserService,
        Crypto,
        LogService,
        LogRepository
    ],
    controllers: [TalkController]
}) 
export class TalkModule {}
