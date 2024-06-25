import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
    constructor(
        private readonly tasksRepository: TasksRepository,
    ){}

    private readonly logger = new Logger(TasksService.name);

    @Cron('0 59 23 * * *')
    async handleCron(){
        this.logger.debug('delete s3 data');
        await this.tasksRepository.deleteS3Data();
    }

    @Cron('0 59 23 * * * ')
    async deleteFile(){
        this.logger.debug('delete save file');
        await this.tasksRepository.deleteSaveFile();
    } 
}
