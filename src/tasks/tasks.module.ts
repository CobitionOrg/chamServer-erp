import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
    providers:[TasksService,TasksRepository,PrismaService]
})
export class TasksModule {}
