import { Module } from '@nestjs/common';
import { ErpController } from './erp.controller';
import { PrismaService } from 'src/prisma.service';
import { ErpService } from './erp.service';

@Module({
    controllers:[ErpController],
    providers:[PrismaService,ErpService]
})
export class ErpModule {

}
