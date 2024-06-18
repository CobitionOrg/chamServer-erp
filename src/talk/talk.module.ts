import { Module } from '@nestjs/common';
import { LogService } from 'src/log/log.service';
import { PrismaService } from 'src/prisma.service';
import { TalkService } from './talk.service';
import { TalkRepositoy } from './talk.repository';
import { TalkController } from './talk.controller';

@Module({
    providers:[PrismaService,TalkService,TalkRepositoy],
    controllers: [TalkController]
})
export class TalkModule {}
