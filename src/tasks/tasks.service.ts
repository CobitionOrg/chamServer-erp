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

    @Cron('0 59 23 * * *')
    async handleCron(){
        this.logger.debug('delete s3 data');
        await this.logService.createLog(
            `데이터 삭제`,
            '데이터 삭제',
            null
        );
        await this.tasksRepository.deleteS3Data();
    }

    @Cron('0 59 23 * * * ')
    async deleteFile(){
        this.logger.debug('delete save file');
        await this.logService.createLog(
            `세이브 파일 삭제`,
            '세이브 파일 삭제',
            null
        );
        await this.tasksRepository.deleteSaveFile();
    }

    @Cron('0 59 23 * * * ')
    async deleteNotCallOrder(){
        this.logger.debug('delete save file');
        await this.logService.createLog(
            `상담 미연결 오더 삭제`,
            '상담 미연결 오더 삭제',
            null
        );
        await this.tasksRepository.deleteNotCallOrder();
    }
    
    //매주 토요일 오전 9시 후기 안내 알람톡 발송
    @Cron('0 9 * * 6')
    async requestReview(){

    }

    //자동 퇴근 처리 기능
    @Cron('0 11 * * 1,4') // 월요일, 목요일 오전 11시 (UTC) -> 저녁 8시 (KST)
    async leavWorkAt20 () {
        this.logger.debug('월, 목요일 20시 자동 퇴근');
        await this.logService.createLog(
            '월, 목요일 20시 자동 퇴근',
            '월, 목요일 20시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(20);
    }

    @Cron('0 9 * * 2,5') // 화요일, 금요일 오전 9시 (UTC) -> 저녁 6시 (KST)
    async leavWorkAt18 () {
        this.logger.debug('화, 금요일 18시 자동 퇴근');
        await this.logService.createLog(
            '화, 금요일 18시 자동 퇴근',
            '화, 금요일 18시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(18);
    }

    @Cron('0 6 * * 6') // 토요일 오전 6시 (UTC) -> 오후 3시 (KST)
    async leaveWorkAt15 () {
        this.logger.debug('토요일 15시 자동 퇴근');
        await this.logService.createLog(
            '토요일 15시 자동 퇴근',
            '토요일 15시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(15);
    }
}
