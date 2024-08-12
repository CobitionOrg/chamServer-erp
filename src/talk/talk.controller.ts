import { Controller, Get, Logger, Query, UseFilters,Headers, HttpException, Body, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { TalkService } from './talk.service';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { OrderInsertTalk } from './Dto/orderInsert.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as moment from 'moment-timezone';
import { AuthGuard } from 'src/auth/auth.guard';
import { MailerService } from '@nestjs-modules/mailer';
import { Public } from 'src/auth/decorators/public.decorator';
import * as path from 'path';
/*
★ 접수확인알림톡 (초/재진 한번에)
-접수확인알림톡(리뉴얼)
- 9시/ 12시/3시

★ 구매후기 (당주 월-금 초진만)
- 구매확정요청
- 토요일 9시

★ 유선상담연결안될시
- 유선상담 후 연결안되는경우
- 금요일 오전 10시


★ 발송알림톡
- 발송(재진)/ 발송(초진)
- 월, 화, 목, 금 오전 11시 
///////////////////////////////

★ 미결제
- 미결제발송지연
- 금요일 오전 10시
*/



@Controller('talk')
@UseFilters(new HttpExceptionFilter())
@ApiTags('카톡 발송 관련 엑셀 api')
@UseGuards(AuthGuard)
export class TalkController {
    constructor(
        private readonly talkService: TalkService,
        private readonly mailerService: MailerService,

    ){}

    private readonly logger = new Logger(TalkController.name);

    // @Get('/')
    // test() {
    //     const currentTime = moment().tz('Asia/Seoul').format();
    //     this.logger.debug(`Current time in Seoul: ${currentTime}`);
    //     return currentTime;
    // }
        
    @ApiOperation({summary:'접수 알림톡 엑셀 데이터 출력'})
    @Get('/orderInsertTalk')
    async orderInsertTalk(@Query() getListDto: GetListDto, @Headers() header) {
        this.logger.log('접수 알림톡 엑셀 데이터 출력');
        const res = await this.talkService.orderInsertTalk(getListDto);
        console.log('-------------------')
        console.log(res);
        if (res.status != 200) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return {success:true,status:res.status,url:res.url,checkUrl:res.checkUrl};
    }

    @ApiOperation({summary:'접수 알림톡 발송 완료 처리'})
    @Post('/orderInsertTalk')
    async orderTalkUpdate(@Body() orderInsertDto: Array<OrderInsertTalk>) {
        this.logger.log('접수 알림톡 발송 완료 처리');
        const res = await this.talkService.orderTalkUpdate(orderInsertDto);
        
        if (res.status != 201) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return {success:true,status:res.status};

    }



    @ApiOperation({summary:'상담 연결 처리'})
    @Patch('/consultingFlag/:id')
    async consultingFlag(@Param('id') id: number) {
        this.logger.log('상담 연결 처리');
        const res = await this.talkService.consultingFlag(id);

        if (res.status != 201) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return {success:true,status:res.status};
    }


    @ApiOperation({summary:'구매 후기'})
    @Get('/payReview')
    async payReview() {
        this.logger.log('구매 후기 용');
        const res = await this.talkService.payReview();

        return res;
    }


    @ApiOperation({summary:'유선 상담 연결 안 될 시'})
    @Get('/notCall')
    async notCall() {
        this.logger.log('유선 상담 연결이 되지 않을 때 데이터');
        const res = await this.talkService.notCall();

        return res;
    }

    @ApiOperation({summary:'발송 알림 톡 엑셀 데이터'})
    @Get('/completeTalk/:id')
    async completeTalk(@Param('id') id: number) {
        this.logger.log('발송 알림 톡 엑셀 데이터');
        const res = await this.talkService.completeSendTalk(id);

        if (res.status != 200) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return {success:true, status:res.status, firstUrl:res.firstUrl, returnUrl: res.returnUrl};
    }


    @ApiOperation({summary:'미입금 된 인원 엑셀 데이터'})
    @Get('/notPay')
    async notPay(@Query() getListDto: GetListDto, @Headers() header){
        this.logger.log('미입금 된 인원 엑셀 데이터');
        const res = await this.talkService.notPay(getListDto);
        if (res.status != 200) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return {success:true,status:res.status,url:res.url};
    }

    // @ApiOperation({summary:'발송 알림톡 자동 발송 처리'})
    // //    @Cron('0 11 * * 1,2,4,5',{timeZone:"Asia/Seoul"})
    // @Get('/test')
    // async completeTalkCron(){
    //     this.logger.log('발송 알림톡 자동 발송 처리');
    //     const res = await this.talkService.completeSendTalkCron();
    // }
  
    // @Public()
    // @Get('/logTest')
    // async sendErrorLog(){
    //     const date = new Date();
    //     const year = date.getFullYear();
    //     const month = date.getMonth()+1;
    //     const day = date.getDate();

    //     const monthTemp = month > 9 ? month : '0'+month;
    //     const dayTemp = day > 9 ? day : "0"+day;

    //     const logFileName = `${year}-${monthTemp}-${dayTemp}.error.log`;
    //     const filePath = `../../logs/error/${logFileName}`
    //     const absoluteFilePath = path.resolve(__dirname, filePath);
    //     console.log(absoluteFilePath);
    //     await this.mailerService.sendMail({
    //         to: 'qudqud97@naver.com',
    //         from: 'noreply@gmail.com',
    //         subject: '에러로그',
    //         text: '에러로그',
    //         attachments : [
    //             {
    //                 path: absoluteFilePath
    //             }
    //         ]
    //     }).then((result) => {
    //         this.logger.log(result);
    //     });
    // }
 

    //     @ApiOperation({summary:'접수 알림톡 자동 발송 처리'})
    // //    @Cron('0 9,12,15 * * 1,2,3,4,5',{timeZone:"Asia/Seoul"})
    //     async orderInsertCron(){
    //         this.logger.log('접수 알림톡 자동 발송 처리');
    //         const res = await this.talkService.orderInsertCron();
    //     }

    // @ApiOperation({summary:'상담 연결 안된 사람들 엑셀 데이터'})
    // @Get('/notConsulting')
    // async notConsulting(@Query() getListDto: GetListDto, @Headers() header) {
    //     this.logger.log('상담 연결 안된 사람들 엑셀 데이터');
    //     const res = await this.talkService.notConsulting(getListDto);
    //     if (res.status != 200) {
    //         throw new HttpException({
    //             success: false,
    //             status: res.status,
    //             msg: res.msg
    //         },
    //             res.status 
    //         );
    //     }

    //     return {success:true,status:res.status,url:res.url};

    // }

    // @ApiOperation({summary:'상담 연결 안된 사람들 카톡 발송'})
    // //@Cron('0 10 * * 5',{timeZone:"Asia/Seoul"})
    // async notConsultingCron(){
    //     this.logger.log('상담 연결 안된 사람들 카톡 발송');
       
    //     const res = await this.talkService.notConsultingCron();
    // }
 
//     @ApiOperation({summary:'미입금 자동 발송 처리'})
// //    @Cron('0 10 * * 5',{timeZone:"Asia/Seoul"})
//     async notPayCron(){
//         this.logger.log('미입금 자동 발송 처리');
//         const res = await this.talkService.notPayCron();
//     }


    // @ApiOperation({summary:'발송 알림톡 자동 발송 처리'})
    // //    @Cron('0 11 * * 1,2,4,5',{timeZone:"Asia/Seoul"})
    // async completeTalkCron(){
    //     this.logger.log('발송 알림톡 자동 발송 처리');
    //     const res = await this.talkService.completeSendTalkCron();
    // }

    
    // @Get('/orderInsertCron')
    // async orderInsertCronTest()
    // {
    //     await this.orderInsertCron();
    //     return true;
    // }
    // @Get('/completeTalkCron')
    // async completeTalkCronTest()
    // {
    //     await this.completeTalkCron();
    //     return true;
    // }
    // @Get('/notPayCron')
    // async notPayCronTest()
    // {
    //     await this.notPayCron();
    //     return true;
    // }
    // @Get('/notConsultingCron')
    // async notConsultingCronTest()
    // {
    //     await this.notConsultingCron();
    //     return true;
    // }
    
}
