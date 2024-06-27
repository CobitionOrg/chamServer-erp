import { Body, Controller, Delete, Get, Headers, Logger, Param, Patch, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
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
import { IpGuard } from './gaurds/ip.guard';
import { AddSendDto } from './Dto/addSend.dto';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { InsertUpdateInfoDto } from './Dto/insertUpdateInfo.dto';
import { CancelOrderDto } from './Dto/cancelOrder.dto';
import { CancelSendOrderDto } from './Dto/cancelSendOrder.dto';

@Controller('erp')
@UseFilters(new HttpExceptionFilter())
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
                '유선상담목록',
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
                '입금상담목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary:'신환 용 엑셀 다운로드'})
    @UseGuards(IpGuard)
    @Get('/newPatientExcel/:date')
    async newPatientExcel(@Param('date') date:string){
        this.logger.log('신환 용 엑셀 파일 다운로드');
        return await this.erpService.newPatientExcel(date);
    }

    @ApiOperation({summary:'차팅 용 엑셀 다운로드'})
    @UseGuards(IpGuard)
    @Get('/chatingExcel/:id')
    async chatingExcel(@Param("id") id:number){
        this.logger.log('차팅 용 엑셀 파일 다운로드');
        return await this.sendService.chatingExcel(id);
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
                `${id}번 주문 정보 업데이트`,
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
                `${id}번 주문 정보 업데이트`,
                '입금상담목록',
                header
            )
        }

        return res;
    }

    @ApiOperation({summary: 'outage 있는 환자 리스트 반환'})
    @Get('/getOutageList')
    async getOutageList(@Query() getOutageListDto: GetListDto) {
        this.logger.log('outage 환자 목록 조회');
        return await this.erpService.getOutageList(getOutageListDto);
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
        return res;
    }

    @ApiOperation({summary:'발송 단일 데이터 조회'})
    @Get('/sendOne/:id')
    async sendOne(@Param("id") id:number, @Headers() header){
        this.logger.log('발송 단일 데이터 조회');
        const res = await this.sendService.getOrderTempOne(id);
        return res;
    }


    @ApiOperation({summary:'입금 상담 목록에서 주문 취소 처리'})
    @Delete('/cancel')
    async cancelOrder(@Body() cancelOrderDto: CancelOrderDto,@Headers() header){
        this.logger.log('입금 상담 목록에서 주문 취소 처리');
        const res = await this.erpService.cancelOrder(cancelOrderDto);
        if(res.success){
            await this.logService.createLog(
                `${cancelOrderDto.orderId}번 오더를 입금 상담 목록에서 주문 취소 처리`,
                '입금상담목록',
                header
            );
        }
        return res;
    }

    @ApiOperation({summary:'발송 목록에서 주문 취소 처리'})
    @Delete('/cancelSend')
    async cancelSend(@Body() cancelSendOrderDto:CancelSendOrderDto,@Headers() header){
        this.logger.log('발송 목록에서 주문 취소 처리');
        const res = await this.sendService.cancelSendOrder(cancelSendOrderDto);
        if(res.success){
            await this.logService.createLog(
                `${cancelSendOrderDto.patientId}번 환자의 ${cancelSendOrderDto.orderId}번 주문 취소`,
                '발송목록',
                header
            )
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
        console.log(surveyDto)
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
    //@UseGuards(IpGuard)
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
    @UseGuards(IpGuard)
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
        console.log(res);
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
                `${id}번 송장 리스트 완료 처리`,
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
    async cashExcel(@Body() insertCashDto : InsertCashDto){
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
    @Post('/combine')
    async combineOrder(@Body() combineOrderDto:CombineOrderDto, @Headers() header){
        this.logger.log('합배송 처리');
        const res = await this.erpService.combineOrder(combineOrderDto);
        const orderIds = combineOrderDto.orderIdArr.join(', ');
        if(res.success){
            await this.logService.createLog(
                `${combineOrderDto.addr}에 ${orderIds}들 합배송`,'입금상담목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'분리 배송 처리'})
    @Post('/separate')
    async separate(@Body() separateDto:SepareteDto, @Headers() header){
        this.logger.log("분리 배송 처리");
        const res = await this.erpService.separate(separateDto);
        const orderIds = separateDto.separate.join(', ');
        if(res.success){
            await this.logService.createLog(
                `${separateDto.separate}들에 ${orderIds}를 분리 배송`,'입금상담목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'완료 처리 된 발송목록 조회'})
    @Get('/completeSendList')
    async completeSendList(@Headers() header){
        this.logger.log('완료 처리 된 발송목록 조회');
        const res = await this.sendService.completeSendList();

        return res;
    }
      //이 이하 로그처리 필요한지
    @ApiOperation({summary:'추가 발송일자 변경'})
    @Post('/addSend')
    async addSend(@Body() addSendDto: AddSendDto,@Headers() header){
        this.logger.log('추가 발송일자 변경 - 장부에만 들어가는 발송일자 변경 인원들');
        const res = await this.sendService.addSend(addSendDto);
        if(res.success){
            await this.logService.createLog(
                `${addSendDto.sendListId}를 ${addSendDto.tempOrderId}에 발송일자 변경`,'발송목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'발송목록에서 수정하는 데이터 수정 체크 리스트 불러오기'})
    @Get('/getUpdateInfo/:id')
    async getUpdateInfo(@Param("id") id: number){
        this.logger.log('발송목록에서 수정하는 데이터 수정 체크 리스트 불러오기');
        const res = await this.sendService.getUpdateInfo(id);

        return res;
    }

    @ApiOperation({summary:'체크된 수정 데이터 orderUpdateInfo 테이블에 데이터 넣기'})
    @Post('/insertUpdateInfo')
    async insertUpdateInfo(@Body() insertUpdateInfoDto: InsertUpdateInfoDto,@Headers() header){
        this.logger.log('체크된 수정 데이터 orderUpdateInfo 테이블에 데이터 넣기');
        const res = await this.sendService.insertUpdateInfo(insertUpdateInfoDto);
        if(res.success){
            await this.logService.createLog(
                `${insertUpdateInfoDto.tempOrderId}번 데이터 수정`,'발송목록',header
            )
        }
        return res;
    }

    //아직 안됨
    @ApiOperation({summary:'장부 출력'})
    @Get('/accountBook/:id')
    async accountBook(@Param("id") id: number){
        this.logger.log('장부 출력');
        const res = await this.sendService.accountBook(id);
        return res;
    }

    @ApiOperation({summary:'주문 미결제 처리'})
    @Patch('/notPay/:id')
    async notPay(@Param("id") id: number,@Headers() header) {
        this.logger.log('주문 미입금 처리');
        const res = await this.sendService.notPay(id);
        return res;
    }

    @ApiOperation({summary:'주문 재결제 요청 처리'})
    @Patch('/requestPay/:id')
    async requestPay(@Param("id") id: number) {
        this.logger.log('주문 미입금 처리');
        const res = await this.sendService.requestPay(id);
        return res;
    }

    @ApiOperation({summary:'결제 요청 처리'})
    @Patch('/completePay/:id')
    async completePay(@Param("id") id: number) {
        this.logger.log('주문 미입금 처리');
        const res = await this.sendService.completePay(id);
        return res;
    }


    @Get('/ffff')
    async ffff(){
        await this.erpService.updateAddr();
    }
}
