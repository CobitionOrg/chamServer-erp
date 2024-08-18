import { Body, Controller, Delete, Get, Head, Headers, Logger, Param, Patch, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
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
import { NewOrderDto } from './Dto/newOrder.dto';
import { CheckDiscountDto } from './Dto/checkDiscount.dto';
import { UpdateSendPriceDto } from './Dto/updateSendPrice.dto';
import { UpdateNoteDto } from './Dto/updateNote.dto';
import { CreateNewReviewDto } from './Dto/createNewReview.dto';
import { zip } from 'rxjs/operators';
import { SendCombineDto } from './Dto/sendCombineDto';
import { GetDateDto } from './Dto/getDate.dto';
import { RouteFlagDto } from './Dto/routeFlag.dto';

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

    @ApiOperation({summary:'해당 날짜 전체 오더 데이터 가져오기'})
    @Get('/getAllOrder')
    async getAllOrderAtDay(@Query() getListDto: GetListDto) {
        this.logger.log('해당 날짜 전체 오더 데이터 가져오기');
        const res = await this.erpService.getAllOrderAtDay(getListDto);

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


    @ApiOperation({summary:'유선 상담 미연결 처리'})
    @Patch('/notCall/:id')
    async notCall(@Param("id") id: number,@Headers() header) {
        this.logger.log('유선 상담 미연결 처리');
        const res = await this.erpService.notCall(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 유선 상담 미연결 처리`,
                '유선상담목록',
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
                '유선상담목록',
                header
            );
        }

        return res;
    }

    @ApiOperation({summary: "유선 상담에서 입금 목록으로 이동"})
    @Post('/callToRec')
    async callToRec(@Body() callConsultingDto: CallConsultingDto, @Headers() header) {
        this.logger.log('유선 상담 목록에서 입금 상담 목록으로 이동');
        const res = await this.erpService.callToRec(callConsultingDto);

        if(res.success) {
            await this.logService.createLog(
                `${callConsultingDto.orderId}번 설문 유선 상담 목록에서 입금 상담 목록으로 이동`,
                `유선상담목록`,
                header
            )
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
    // @UseGuards(IpGuard)
    @Get('/newPatientExcel/:date')
    async newPatientExcel(@Param('date') date:string,@Headers() header){
        this.logger.log('신환 용 엑셀 파일 다운로드');
        const res=await this.erpService.newPatientExcel(date);
        if(res.success){
            await this.logService.createLog(
                `${date} 신환 용 엑셀 파일 다운로드`,
                '입금상담목록',
                header
            );
        }
        return res;
    }

    @ApiOperation({summary:'차팅 용 엑셀 다운로드'})
    // @UseGuards(IpGuard)
    @Get('/chatingExcel/:id')
    async chatingExcel(@Param("id") id:number,@Headers() header){
        this.logger.log('차팅 용 엑셀 파일 다운로드');
        const res=await this.sendService.chatingExcel(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 차팅 용 엑셀 파일 다운로드`,
                '발송목록',
                header
            );
        }
        return res;
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
            );
        }

        return res;
    }

    @ApiOperation({summary: '원장님이 환자 정보 업데이트'})
    @Post('/doctor-order-update/:id')
    async updateOrderByDoc(@Body() updateSurveyDto : UpdateSurveyDto, @Param('id') id : number, @Headers() header) {
        this.logger.log('원장님이 환자 정보 업데이트');
        const res = await this.erpService.updateOrderByDoc(updateSurveyDto, id);

        if(res.success){
            await this.logService.createLog(
                `${id}번 환자 정보 업데이트`,
                '입금상담목록',
                header
            )
        }

        return res;
    }

    @ApiOperation({summary: 'outage 있는 환자 리스트 반환'})
    // @Public()
    @Get('/getOutageList')
    async getOutageList(@Query() getOutageListDto: GetListDto) {
        this.logger.log('outage 환자 목록 조회');
        return await this.erpService.getOutageList(getOutageListDto);
    }

    @ApiOperation({summary:'누적 후기 수 가져오기'})
    @Get('/getOutageCount')
    async getOutageCount(@Query() getDateDto: GetDateDto) {
        this.logger.log('누적 후기 수 가져오기');
        return await this.erpService.getOutageCount(getDateDto);
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
        const res = await this.sendService.getOrderTemp(id);
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
    @Patch('/cancel')
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

    @ApiOperation({ summary: '취소된 주문 조회' })
    @Get('/canceledOrderList')
    async getCanceledOrderList(@Query() getListDto: GetListDto) {
        this.logger.log('취소된 주문 조회');
        const res = await this.erpService.getCanceledOrderList(getListDto);
        return res;
    }

    @ApiOperation({ summary: '취소된 주문 복구' })
    @Patch('/restoreCanceledOrder')
    async restoreCanceledOrder(@Body() cancelOrderDto: CancelOrderDto, @Headers() header) {
        this.logger.log('취소된 주문 복구');
        const res = await this.erpService.restoreCanceledOrder(cancelOrderDto);

        if(res.success) {
            await this.logService.createLog(
                `취소된 ${cancelOrderDto.orderId}번 주문 복구`,
                `취소된 상담 목록`,
                header
            );
        }

        return res;
    }

  
    // 이 api는 아예 주문을 날려버리는 api이므로 나중에 다시 확인하도록 하겠습니다.
    // @ApiOperation({summary:'발송 목록에서 주문 취소 처리'})
    // @Delete('/cancelSend')
    // async cancelSend(@Body() cancelSendOrderDto:CancelSendOrderDto,@Headers() header){
    //     this.logger.log('발송 목록에서 주문 취소 처리');
    //     const res = await this.sendService.cancelSendOrder(cancelSendOrderDto);
    //     if(res.success){
    //         await this.logService.createLog(
    //             `${cancelSendOrderDto.patientId}번 환자의 ${cancelSendOrderDto.orderId}번 주문 취소`,
    //             '발송목록',
    //             header
    //         )
    //     }
    //     return res;
    // }

    @ApiOperation({summary:'발송 목록에서 주문 취소 처리'})
    @Delete('/cancelSendOrder/:id')
    async cancelSendOrder(@Param("id") id: number,@Headers() header){
        this.logger.log('발송 목록에서 주문 취소 처리');
        const res = await this.sendService.cancelSendOrderFlag(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 발송 목록에서 주문 취소 처리`,'발송목록',header
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

    @ApiOperation({summary:'발송목록에서 금액만 수정'})
    @Patch('/updateSendPrice')
    async updateSendPrice(@Body() updateSendPriceDto: UpdateSendPriceDto,@Headers() header){
        this.logger.log('발송목록에서 금액만 수정');
        const res = await this.sendService.updateSendPrice(updateSendPriceDto);
        if(res.success){
            await this.logService.createLog(
                `${updateSendPriceDto.id}번 발송목록에서 금액만 수정`,'발송목록',header
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
    // @UseGuards(IpGuard)
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
    async cashExcel(@Body() insertCashDto : InsertCashDto,@Headers() header){
        this.logger.log('입금 파일 데이터 업로드');
        const res= await this.erpService.cashExcel(insertCashDto);
        if(res.success){
            await this.logService.createLog(
                `입금 파일 데이터 업로드`,
                '입금상담목록',
                header
            );
        }

        return res;
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

    // //테스트 용 api
    // @ApiOperation({summary:'가격 일괄 업데이트'})
    // @Get('/update/price')
    // async updatePrice(){
    //     this.logger.log('가격 일괄 업데이트');
    //     return await this.erpService.updatePrice();
    // }

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
                '발송목록',
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

    @ApiOperation({summary: '발송 목록끼리 합배송 처리'})
    @Post('/send-combine')
    async sendCombine(@Body() sendCombineDto: SendCombineDto, @Headers() header) {
        this.logger.log('합배송 처리');
        const res = await this.erpService.sendCombine(sendCombineDto);
        const tempOrderIds = [];
        for (let i = 0; i < sendCombineDto.idsObjArr.length; i++) {
            tempOrderIds.push(sendCombineDto.idsObjArr[i].tempOrderId)
        }
        if(res.success){
            await this.logService.createLog(
                `${sendCombineDto.addr}에 ${tempOrderIds}들 합배송`,'발송 목록',header
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
        this.logger.log('발송목록에서 수정하는 데이터 수정 체크 리스트 불러오기');//에러발생
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


    @ApiOperation({summary:'장부 출력'})
    @Get('/accountBook/:id')
    async accountBook(@Param("id") id: number,@Headers() header){
        this.logger.log('장부 출력');
        const res = await this.sendService.accountBook(id);
        if(res.success){
            await this.logService.createLog(
                `장부 출력`,'완료된발송목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'주문 미결제 처리'})
    @Patch('/notPay/:id')
    async notPay(@Param("id") id: number,@Headers() header) {
        this.logger.log('주문 미결제 처리');
        const res = await this.sendService.notPay(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 결제 미완료 처리`,'발송목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'주문 재결제 요청 처리'})
    @Patch('/requestPay/:id')
    async requestPay(@Param("id") id: number,@Headers() header) {
        this.logger.log('주문 재결제 요청 처리');
        const res = await this.sendService.requestPay(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 결제 재요청`,'발송목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'결제 완료 처리'})
    @Patch('/completePay/:id')
    async completePay(@Param("id") id: number,@Headers() header) {
        this.logger.log('결재 완료 처리');
        const res = await this.sendService.completePay(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 결제 완료 처리`,'발송목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'원내에서 주문 생성'})
    @Post('/newOrder')
    async newOrder(@Body() newOrderDto: NewOrderDto,@Headers() header){
        this.logger.log('원내에서 주문 생성');
        const res = await this.erpService.newOrder(newOrderDto);

        return res;
    }

    @ApiOperation({summary:'데스크에서 업데이트 내역 체크'})
    @Patch('/checkUpdateAtDesk/:id')
    async checkUpdateAtDesk(@Param("id") id: number,@Headers() header) {
        this.logger.log('데스크에서 업데이트 내역 체크');
        const res = await this.sendService.checkUpdateAtDesk(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 데스크에서 업데이트 내역 체크`,'발송목록',header
            )
        }
        return res;
    }


    @ApiOperation({summary:'감비환실에서 업데이트 내역 체크'})
    @Patch('/checkUpdateAtGam/:id')
    async checkUpdateAtGam(@Param("id") id: number,@Headers() header) {
        this.logger.log('감비환실에서 업데이트 내역 체크');
        const res = await this.sendService.checkUpdateAtGam(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 감비환실에서 업데이트 내역 체크`,'발송목록',header
            )
        }
        return res;
    }



    @ApiOperation({summary:'지인 확인 할인 여부 체크'})
    @Post('/checkDiscount')
    async checkDiscount(@Body() checkDiscountDto: CheckDiscountDto,@Headers() header){
        this.logger.log('지인 확인 할인 여부 체크');
        const res = await this.erpService.checkDiscount(checkDiscountDto);
        if(res.success){
            await this.logService.createLog(
                `${checkDiscountDto.orderId}번 지인 확인 할인 여부 체크`,'입금상담목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'지인 할인 취소'})
    @Patch('/cancelDiscount/:id')
    async cancelDiscount(@Param("id") id: number,@Headers() header) {
        this.logger.log('지인 할인 취소');
        const res = await this.erpService.cancelDiscount(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 지인 할인 취소`,'입금상담목록',header
            )
        }
        return res;
    }


    @ApiOperation({summary:'후기 대상 목록에서 비고 수정'})
    @Patch('/updateNote')
    async updateNote(@Body() updateNoteDto: UpdateNoteDto,@Headers() header) {
        this.logger.log('후기 대상 목록에서 비고 수정');
        const res = await this.erpService.updateNote(updateNoteDto);
       if(res.success){
            await this.logService.createLog(
                `${updateNoteDto.orderId}번 후기 대상 목록에서 비고 수정`,'후기대상목록',header
            )
        }
        return res;
    }

    @ApiOperation({summary:'후기 대상 목록에서 후기 유무 체크'})
    @Patch('/updateReviewFlag/:id')
    async updateReviewFlag(@Param('id') id: number,@Headers() header) {
        this.logger.log('후기 대상 목록에서 후기 유무 체크');
        const res = await this.erpService.updateReviewFlag(id);
        if(res.success){
            await this.logService.createLog(
                `${id}번 후기 대상 목록에서 후기 유무 체크`,'후기대상목록',header
            )
        }
        return res;

    }


    @ApiOperation({summary:'후기 대상 목록에서 새 후기 대상 생성'})
    @Post('/createNewReview')
    async createNewReview(@Body() createNewReviewDto: CreateNewReviewDto) {
        this.logger.log('후기 대상 목록에서 새 후기 대상 생성');
        const res = await this.erpService.createNewReview(createNewReviewDto);

        return res;
    }

    @ApiOperation({summary: '입금/상담 목록에서 합배송 시 발송 목록 조회'})
    @Get('/not-completed')
    async getNotFixedTempOrderList() {
        this.logger.log('입금/상담 목록에서 합배송 시 발송 목록 조회');
        const res = await this.sendService.getNotCompletedTempOrderList();

        return res;
    }

    @ApiOperation({summary: '발송목록에서 금액 변경 확인 체크'})
    @Patch("/checkPrice/:id")
    async checkPrice(@Param("id") id: number) {
        this.logger.log('발송목록에서 금액 변경 확인 체크 처리');

        const res = await this.sendService.checkPrice(id);
        return res;
    }

    // @Get('/sendNumTestExcel/:id')
    // async sendNumTestExcel(@Param("id") id: number){
    //     console.log(id);
    //     return await this.sendService.sendNumExcelTest(id);
    // }

    // @Get('/ffff')
    // async ffff(){
    //     await this.erpService.updateAddr();
    // }

    @ApiOperation({summary:'지인 확인 체크'})
    @Patch('/updateRouteFlag')
    async updateRouteFlag(@Body() routeFlagDto:RouteFlagDto){
        this.logger.log('입금상담목록에서 지인 확인 체크 안된 거 색칠 처리');
        const res = await this.erpService.updateRouteFlag(routeFlagDto);

        return res;
    }

    @ApiOperation({summary:'지인 10% 할인 적용'})
    @Patch('/friendDiscount/:id')
    async friendDiscount(@Param("id") id: number) {
        this.logger.log('지인 10% 할인 적용');
        const res = await this.erpService.friendDiscount(id);
        
        return res;
    }

    @Public()
    @Get('/updateCheck')
    async updateCheck () {
        return await this.sendService.updateCheck();
    }


    @ApiOperation({summary:'후기 취소'})
    @Patch('/reviewFlag/:id')
    async reviewFlag(@Param("id") id: number){
        this.logger.log('후기 취소');
        const res = await this.sendService.reviewFlag(id);

        return res;
        
    }
    /////////////////////////////////////////////////////////////////////////////////////////////데이터 테스트입니다.
    /////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////

    // @Public()
    // @Post('/testPatientDataInsert')
    // async testPatientDataInsert() {
    //     return await this.erpService.testPatientDataInsert();
    // }

    // @Public()
    // @Get('/testPatientDataExport')
    // async testPatientDataExport() {
    //     const res = await this.erpService.testPatientDataExport();
    //     return res;
    // }

    // @Public()
    // @Post('/testOrderDataInsert')
    // async testOrderDataInsert() {
    //     return await this.erpService.testOrderDataInsert();
    // }

    // @Public()
    // @Get('/testOrderDataExport')
    // async testOrderDataExport() {
    //     const res = await this.erpService.testOrderDataExport();
    //     return res;
    // }

    // // 환자 엑셀 데이터 삽입
    // @Public()
    // @Get('/importAndInsert')
    // async importAndInsert() {
    //     const filePath = ''
    //     const res = await this.erpService.importAndInsert(filePath);
    //     return res;
    // }

    // // 양식에 맞지 않는 환자 데이터 거르기
    // @Public()
    // @Get('/filtering-patient')
    // async patientFiltering() {
    //     // filePath 수정 필요
    //     const filePath = '';
    //     const validFilePath = '';
    //     const invalidFilePath = '';
    //     const res = await this.erpService.patientFiltering(filePath, validFilePath, invalidFilePath);
    //     return res;
    // }

    // // 발송 목록 고객 리스트 정리
    // @Public()
    // @Get('/extract-patient')
    // async extractPatient() {
    //     const wtf = [25, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45];
    //     // filePath 수정 필요
    //     for(let i of wtf) {
    //         const inputFilePath = ``;
    //         const outputFilePath = ``;
    //         const res = await this.erpService.extractPatient(inputFilePath, outputFilePath);
    //     }
    //     return { success: true };
    // }

    // @Public()
    // @Get('/merge')
    // async merge() {
    //     await this.erpService.merge();
    //     return { success: true };
    // }

    // // 발송 목록에 없는 환자 제외
    // @Public()
    // @Get('/final-filtering')
    // async fianlFiltering() {
    //     const res = await this.erpService.finalFiltering();
    //     return res;
    // }

    // // 환자 데이터 넣기
    // // 운영용(env db 수정 필)
    // @Public()
    // @Post('/patient')
    // async insertPatient() {
    //     const res = await this.erpService.insertPatient();
    //     return res;
    // }
    
    // // 새로 받은 환자 데이터 기존 DB와 비교 후 없으면 삽입
    // @Public()
    // @Post('/compare-insert')
    // async compareAndInsert() {
    //     const res = await this.erpService.compareAndInsert();
    //     return res;
    // }
}
