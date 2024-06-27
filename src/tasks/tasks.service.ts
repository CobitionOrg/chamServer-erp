import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TasksRepository } from './tasks.repository';
import { LogService } from 'src/log/log.service';

@Injectable()
export class TasksService {
    constructor(
        private readonly tasksRepository: TasksRepository,
        private readonly logService : LogService,
    ){}

    private readonly logger = new Logger(TasksService.name);

    @Cron('0 59 23 * * *')
    async handleCron(){
        this.logger.debug('delete s3 data');
        await this.logService.createLog(
            `delete s3 data`,
            'delete s3 data',
            null
        );
        await this.tasksRepository.deleteS3Data();
    }
}
