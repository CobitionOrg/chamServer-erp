import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksRepository } from './tasks.repository';
import { LogService } from 'src/log/log.service';

@Injectable()
export class TasksService {
    constructor(
        private readonly tasksRepository: TasksRepository,
        private readonly logService : LogService,
    ){}

    private readonly logger = new Logger(TasksService.name);

    @Cron('0 59 23 * * *',{timeZone:"Asia/Seoul"})
    async handleCron(){
        this.logger.debug('delete s3 data');
        await this.logService.createLog(
            `데이터 삭제`,
            '데이터 삭제',
            null
        );
        await this.tasksRepository.deleteS3Data();
    }

    @Cron('0 59 23 * * * ',{timeZone:"Asia/Seoul"})
    async deleteFile(){
        this.logger.debug('delete save file');
        await this.logService.createLog(
            `세이브 파일 삭제`,
            '세이브 파일 삭제',
            null
        );
        await this.tasksRepository.deleteSaveFile();
    }
    
    //매주 토요일 오전 9시 후기 안내 알람톡 발송
    @Cron('0 9 * * 6',{timeZone:"Asia/Seoul"})
    async requestReview(){

    }

    //자동 퇴근 처리 기능
}
