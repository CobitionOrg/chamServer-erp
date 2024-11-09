import { Module, forwardRef } from '@nestjs/common';
import { ErpController } from './erp.controller';
import { PrismaService } from 'src/prisma.service';
import { ErpService } from './erp.service';
import { AdminService } from 'src/admin/admin.service';
import { AdminModule } from 'src/admin/admin.module';
import { UserService } from 'src/user/user.service';
import { SendService } from './send.service';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';
import { IpGuard } from './gaurds/ip.guard';
import { Crypto } from 'src/util/crypto.util';
import { AdminRepository } from 'src/admin/admin.repository';

@Module({
    controllers:[ErpController],
    providers:[
        PrismaService,
        ErpService,
        AdminService,
        UserService,
        SendService,
        LogService,
        LogRepository,
        IpGuard,
        Crypto,
        AdminRepository,
    ]
})

export class ErpModule {

}
