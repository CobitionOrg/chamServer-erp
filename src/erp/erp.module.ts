import { Module, forwardRef } from '@nestjs/common';
import { ErpController } from './erp.controller';
import { PrismaService } from 'src/prisma.service';
import { ErpService } from './erp.service';
import { AdminService } from 'src/admin/admin.service';
import { AdminModule } from 'src/admin/admin.module';
import { UserService } from 'src/user/user.service';
import { SendService } from './send.service';

@Module({
    controllers:[ErpController],
    providers:[PrismaService,ErpService,AdminService,UserService,SendService]
})

export class ErpModule {

}
