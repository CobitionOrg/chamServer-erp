import { Body, Controller, Get, Headers, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ErpService } from './erp.service';
import { SurveyAnswerDto } from './Dto/surveyAnswer.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { CallConsultingDto } from './Dto/callConsulting.dto';
import { getToken } from 'src/util/token';
import { SurveyDto } from './Dto/survey.dto';
import { OrderUpd } from 'src/auth/decorators/order.decorator';
import { UpdateSurveyDto } from './Dto/updateSurvey.dto';
import { SendService } from './send.service';
import { SendOrder } from './Dto/sendExcel.dto';
import axios from 'axios';
import { GetListDto } from './Dto/getList.dto';
import { InsertCashDto } from './Dto/insertCash.dto';
import { UpdateTitleDto } from './Dto/updateTitle.dto';
import { CompleteSetSendDto } from './Dto/completeSetSend.dto';
import { LogService } from 'src/log/log.service';
import { CombineOrderDto } from './Dto/combineOrder.dto';
import { SepareteDto } from './Dto/separteData.dto';

@Controller('erp')
@UseGuards(AuthGuard)
@ApiTags('erp api')
export class ErpController {
    constructor(
        private readonly erpService : ErpService,
        private readonly sendService : SendService,
        private readonly logService : LogService,
    ){}

    private readonly logger = new Logger(ErpController.name);

    @ApiOperation({summary:'초진 주문 접수'})
    @Public()
    @Post('/first')
    async insertFirstOrder(@Body() surveyDto : SurveyDto){
        this.logger.log('초진 주문 접수');
        return await this.erpService.insertFirstOrder(surveyDto);
    }

    @ApiOperation({summary:'재진 주문 접수'})
    @Public()
    @Post('/return')
    async insertReturnOrder(@Body() surveyDto : SurveyDto){
        this.logger.log('재진 주문 접수');
        return await this.erpService.insertReturnOrder(surveyDto);
    }

    @ApiOperation({summary:'환자가 자기 오더 업데이트'})
    @OrderUpd()
    @Post('/update/:id')
    async updateOrder(@Body() surveyDto : SurveyDto, @Headers() header, @Param('id') id : number){
        this.logger.log('환자가 자기 오더 업데이트');
        console.log('??')
        return await this.erpService.updateOrder(surveyDto,getToken(header),id);
    }

    @ApiOperation({summary:'오더 리스트 조회'})
    @Get('/getList')
    async getReciptList(@Query() getListDto: GetListDto, @Headers() header){
       this.logger.log('오더 리스트 조회');
       const res = await this.erpService.getReciptList(getListDto); 

       if(res.success){
            await this.logService.createLog('오더 리스트 조회','입금상담목록',header);
       }

       return res;
    }

    @ApiOperation({summary:'유선 상담 목록으로 변경'})
    @Post('/callConsulting')
    async callConsulting(@Body() callConsultingDto : CallConsultingDto, @Headers() header){
        this.logger.log('유선 상담 목록으로 이동');
        const res = await this.erpService.callConsulting(callConsultingDto);

        if(res.success){
            await this.logService.createLog(
                `${callConsultingDto.orderId}번 설문 유선 상담 목록으로 이동`,
                '입금상담목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'유선 상담 목록 조회'})
    @Get('/callConsulting')
    async getCallList(@Headers() header, @Query() getListDto: GetListDto){
        this.logger.log('유선 상담 목록 조회');
        const res = await this.erpService.getCallList(getToken(header), getListDto);

        if(res.success){
            await this.logService.createLog(
                '유선 상담 목록 조회',
                '유선 상담 목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'유선 상담 완료 처리'})
    @Post('/callComplete')
    async callComplete(@Body() callConsultingDto : CallConsultingDto, @Headers() header){
        this.logger.log('유선 상담 완료');
        const res = await this.erpService.callComplete(callConsultingDto,getToken(header));

        if(res.success){
            await this.logService.createLog(
                `${callConsultingDto.orderId}번 설문 유선 상담 완료 처리`,
                '유선 상담 목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'발송 목록으로 이동 처리'})
    @Post('/completeConsulting/:id')
    async completeConsulting(@Param('id') id: number, @Headers() header){
        this.logger.log('발송 목록으로 이동 처리');
        const res = await this.erpService.completeConsulting(id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 발송 목록으로 이동 처리`,
                '입금 상담 목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'신환 용 엑셀 다운로드'})
    @Get('/newPatientExcel')
    async newPatientExcel(@Headers() header){
        this.logger.log('신환 용 엑셀 파일 다운로드');
        return await this.erpService.newPatientExcel();
    }

    @ApiOperation({summary:'차팅 용 엑셀 다운로드'})
    @Get('/chatingExcel')
    async chatingExcel(){
        this.logger.log('차팅 용 엑셀 파일 다운로드');
        return await this.erpService.chatingExcel();
    }

    @Public()
    @Get('/s3')
    async s3Test(){
        return await this.erpService.s3Url();
    }

    @ApiOperation({summary: '직원이 환자 정보 업데이트'})
    @Post('/staff-order-update/:id')
    async updateOrderByStaff(@Body() updateSurveyDto : UpdateSurveyDto, @Param('id') id : number, @Headers() header) {
        this.logger.log('직원이 환자 정보 업데이트');
        const res = await this.erpService.updateOrderByStaff(updateSurveyDto, id);

        if(res.success){
            await this.logService.createLog(
                `${updateSurveyDto.patientId}번 환자의 ${id}번 주문 정보 업데이트`,
                '입금상담목록',
                header
            )
        }

        return res;
    }

    @ApiOperation({summary: '원장님이 환자 정보 업데이트'})
    @Post('/doctor-order-update/:id')
    async updateOrderByDoc(@Body() updateSurveyDto : UpdateSurveyDto, @Param('id') id : number, @Headers() header) {
        this.logger.log('직원이 환자 정보 업데이트');
        const res = await this.erpService.updateOrderByDoc(updateSurveyDto, id);

        if(res.success){
            await this.logService.createLog(
                `${updateSurveyDto.patientId}번 환자의 ${id}번 주문 정보 업데이트`,
                '유선상담목록',
                header
            )
        }

        return res;
    }
  
    //쓰는지 여부 확인
    @ApiOperation({summary: '지인 확인'})
    @Get('/acquaintance-check/:route')
    async checkAcquaintance(@Param("route") route: string) {
        this.logger.log('지인 확인');
        return await this.erpService.checkAcquaintance(route);
    }

    @ApiOperation({summary:'발송 목록 조회'})
    @Get('/sendList/:id')
    async getSendOne(@Param("id") id:number, @Headers() header){
        this.logger.log('발송 목록 리스트');
        const res = await this.sendService.getOrderTempList(id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 발송목록 조회`,
                '발송 목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'발송 단일 데이터 조회'})
    @Get('/sendOne/:id')
    async sendOne(@Param("id") id:number, @Headers() header){
        this.logger.log('발송 단일 데이터 조회');
        const res = await this.sendService.getOrderTempOne(id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 발송 데이터 조회`,
                '발송 목록',
                header
            );
        }

        return res;
    }

    //테스트용 api
    // @ApiOperation({summary:'발송 목록 세팅'})
    // @Get('/setSendList')
    // async setSendList(){
    //     this.logger.log('발송 목록 세팅');
    //     return await this.sendService.setSendList();
    // }

    @ApiOperation({summary:'발송목록에서 오더 수정'})
    @Patch('/updateSendOrder')
    async updateSendOrder(@Body() surveyDto : UpdateSurveyDto, @Headers() header){
        this.logger.log('발송목록에서 오더 수정');
        const res = await this.sendService.updateSendOrder(surveyDto);

        if(res.success){
            await this.logService.createLog(
                `${surveyDto.patientId}번 환자의 ${surveyDto.orderId}번 주문 정보 업데이트`,
                '발송목록',
                header
            )
        }

        return res;
    }

    @ApiOperation({summary:'송장번호를 위한 엑셀'})
    @Get('/sendNumExcel/:id')
    async sendNumExcel(@Param("id") id:number, @Headers() header){
        this.logger.log('송장번호를 위한 엑셀');
        const res = await this.sendService.sendNumExcel(id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 발송리스트 송장번호를 위한 엑셀 출력`,
                '발송목록',
                header
            );
        }

        return res;
    }
  
    @ApiOperation({summary:'송장번호 엑셀 업로드해서 송장번호 업데이트'})
    @Patch('/setSendNum')
    async setSendNum(@Body() sendExcelDto:SendOrder[], @Headers() header){
        this.logger.log('송장번호 저장');
        const res = await this.sendService.setSendNum(sendExcelDto);

        if(res.success){
            await this.logService.createLog(
                '송장번호 엑셀 업로드해서 송장번호 업데이트',
                '발송목록',
                header
            )
        }

        return res;
    }

    @ApiOperation({summary:'발송목록 리스트 가져오기'})
    @Get('/getSendList')
    async getSendList(@Headers() header){
        this.logger.log('발송목록 리스트 가져오기');
        const res = await this.sendService.getSendList();

        if(res.success){
            await this.logService.createLog(
                '발송목록 리스트 가져오기',
                '발송목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'발송 완료된 발송목록 리스트 가져오기'})
    @Get('/getCompleteSend')
    async getCompleteSend(@Headers() headers){
        this.logger.log('발송 완료된 발송목록 리스트 가져오기');
        const res = await this.sendService.getCompleteSend();
        return res;
    }

    
    @ApiOperation({summary:'송장 리스트 완료 처리'})
    @Patch('/completeSend/:id')
    async completeSend(@Param("id") id:number,@Headers() header){
        this.logger.log('송장 리스트 완료 처리');
        const res = await this.sendService.completeSend(id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 발송목록 완료 처리`,
                '발송목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'발송목록 고정'})
    @Patch('/fixSendList/:id')
    async fixSendList(@Param("id") id:number, @Headers() header){
        this.logger.log('발송목록 고정');
        const res = await this.sendService.fixSendList(id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 발송목록 고정`,
                '발송목록',
                header
            );
        }

        return res;
    }

    //안 씀
    @ApiOperation({summary:'발송목록 고정 해제'})
    @Patch('/cancelFix/:id')
    async cancelFix(@Param("id") id:number){
        this.logger.log('발송목록 고정 해제');
        return await this.sendService.cancelFix(id);
    }

    //로직 보강 처리
    @ApiOperation({summary:'입금 파일 데이터 업로드'})
    @Post('/cashExcel')
    async cashExcel(@Body() insertCashDto : Array<InsertCashDto>){
        this.logger.log('입금 파일 데이터 업로드');
        return await this.erpService.cashExcel(insertCashDto);
    }

    @ApiOperation({summary:'발송목록 타이틀 수정'})
    @Patch('/update/title')
    async updateSendTitle(@Body() updateTitleDto: UpdateTitleDto, @Headers() header){
        this.logger.log('발송 목록 타이틀 업데이트');
        const res = await this.sendService.updateSendTitle(updateTitleDto);

        if(res.success){
            await this.logService.createLog(
                `${updateTitleDto.id}번 발송목록 이름을 ${updateTitleDto.title}로 변경`,
                '발송목록', 
                header
            );
        }

        return res;
    }

    //테스트 용 api
    @ApiOperation({summary:'가격 일괄 업데이트'})
    @Get('/update/price')
    async updatePrice(){
        this.logger.log('가격 일괄 업데이트');
        return await this.erpService.updatePrice();
    }

    @ApiOperation({summary:'발송목록 완료 안 된 전체 리스트 가져오기'})
    @Get('/getAllSendList')
    async getAllSendList(@Headers() header){
        this.logger.log('발송목록 완료 안 된 전체 리스트 가져오기');
        const res = await this.sendService.getAllSendList();

        if(res.success){
            await this.logService.createLog(
                '발송목록 미완료 리스트 전체 조회',
                '발송목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'특정 발송목록을 선택해서 해당 발송목록으로 넘기기'})
    @Post('/completeSetSend')
    async completeConsultingSetSend(@Body() completeSetSendDto: CompleteSetSendDto,@Headers() header){
        this.logger.log('특정 발송목록을 선택해서 해당 발송목록으로 넘기기');
        const res = await this.erpService.completeConsultingSetSend(completeSetSendDto);

        if(res.success){
            await this.logService.createLog(
                `${completeSetSendDto.orderId}번 오더를 ${completeSetSendDto.sendListId}번 발송리스트에 삽입`,
                '입금상담목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'합배송 처리'})
    @Public()
    @Post('/combine')
    async combineOrder(@Body() combineOrderDto:CombineOrderDto, @Headers() header){
        this.logger.log('합배송 처리');
        const res = await this.erpService.combineOrder(combineOrderDto);

        // if(res.success){
        //     await this.logService.createLog(
                
        //     )
        // }
        return res;
    }

    @ApiOperation({summary:'분리 배송 처리'})
    @Post('/separate')
    async separate(@Body() separateDto:SepareteDto, @Headers() header){
        this.logger.log("분리 배송 처리");
        const res = await this.erpService.separate(separateDto);

        return res;
    }

    @ApiOperation({summary:'완료 처리 된 발송목록 조회'})
    @Get('/completeSendList')
    async completeSendList(@Headers() header){
        this.logger.log('완료 처리 된 발송목록 조회');
        const res = await this.sendService.completeSendList();

        return res;
    }
       
}
