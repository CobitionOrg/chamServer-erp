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

@Controller('erp')
@UseGuards(AuthGuard)
@ApiTags('erp api')
export class ErpController {
    constructor(
        private erpService : ErpService,
        private sendService : SendService,
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
    async getReciptList(@Query() getListDto: GetListDto){
       this.logger.log('오더 리스트 조회');
       return await this.erpService.getReciptList(getListDto); 
    }

    @ApiOperation({summary:'유선 상담 목록으로 변경'})
    @Post('/callConsulting')
    async callConsulting(@Body() callConsultingDto : CallConsultingDto){
        this.logger.log('유선 상담 목록으로 이동');
        return await this.erpService.callConsulting(callConsultingDto);
    }

    @ApiOperation({summary:'유선 상담 목록 조회'})
    @Get('/callConsulting')
    async getCallList(@Headers() header, @Query() getListDto: GetListDto){
        this.logger.log('유선 상담 목록 조회');
        return await this.erpService.getCallList(getToken(header), getListDto);
    }

    @ApiOperation({summary:'유선 상담 완료 처리'})
    @Post('/callComplete')
    async callComplete(@Body() callConsultingDto : CallConsultingDto, @Headers() header){
        this.logger.log('유선 상담 완료');
        return await this.erpService.callComplete(callConsultingDto,getToken(header));
    }

    @ApiOperation({summary:'발송 목록으로 이동 처리'})
    @Post('/completeConsulting/:id')
    async completeConsulting(@Param('id') id: number){
        this.logger.log('발송 목록으로 이동 처리');
        return await this.erpService.completeConsulting(id);
    }

    @ApiOperation({summary:'신환 용 엑셀 다운로드'})
    @Get('/newPatientExcel')
    async newPatientExcel(){
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
    async updateOrderByStaff(@Body() updateSurveyDto : UpdateSurveyDto, @Param('id') id : number) {
        this.logger.log('직원이 환자 정보 업데이트');
        return await this.erpService.updateOrderByStaff(updateSurveyDto, id);
    }

    @ApiOperation({summary: '원장님이 환자 정보 업데이트'})
    @Post('/doctor-order-update/:id')
    async updateOrderByDoc(@Body() updateSurveyDto : UpdateSurveyDto, @Param('id') id : number) {
        this.logger.log('직원이 환자 정보 업데이트');
        return await this.erpService.updateOrderByDoc(updateSurveyDto, id);
    }
  
    @ApiOperation({summary: '지인 확인'})
    @Get('/acquaintance-check/:route')
    async checkAcquaintance(@Param("route") route: string) {
        this.logger.log('지인 확인');
        return await this.erpService.checkAcquaintance(route);
    }

    @ApiOperation({summary:'발송 목록 조회'})
    @Get('/sendList/:id')
    async getSendOne(@Param("id") id:number){
        this.logger.log('발송 목록 리스트');
        return await this.sendService.getOrderTempList(id);
    }

    @ApiOperation({summary:'발송 단일 데이터 조회'})
    @Get('/sendOne/:id')
    async sendOne(@Param("id") id:number){
        this.logger.log('발송 단일 데이터 조회');
        return await this.sendService.getOrderTempOne(id);
    }

    @ApiOperation({summary:'발송 목록 세팅'})
    @Public()
    @Get('/setSendList')
    async setSendList(){
        this.logger.log('발송 목록 세팅');
        return await this.sendService.setSendList();
    }

    @ApiOperation({summary:'발송목록에서 오더 수정'})
    @Patch('/updateSendOrder')
    async updateSendOrder(@Body() surveyDto : UpdateSurveyDto){
        this.logger.log('발송목록에서 오더 수정');
        return await this.sendService.updateSendOrder(surveyDto);
    }

    @ApiOperation({summary:'발송번호 엑셀'})
    @Get('/sendNumExcel/:id')
    async sendNumExcel(@Param("id") id:number){
        this.logger.log('발송번호 엑셀');
        return await this.sendService.sendNumExcel(id);
    }
  
    @ApiOperation({summary:'송장번호 엑셀로 송장번호 업로드'})
    @Patch('/setSendNum')
    async setSendNum(@Body() sendExcelDto:SendOrder[]){
        this.logger.log('송장번호 저장');
        return await this.sendService.setSendNum(sendExcelDto);
    }

    @ApiOperation({summary:'발송목록 리스트 가져오기'})
    @Get('/getSendList')
    async getSendList(){
        this.logger.log('발송목록 리스트 가져오기');
        return await this.sendService.getSendList();
    }

    @ApiOperation({summary:'송장 리스트 완료 처리'})
    @Patch('/completeSend/:id')
    async completeSend(@Param("id") id:number){
        this.logger.log('송장 리스트 완료 처리');
        return await this.sendService.completeSend(id);
    }

    @ApiOperation({summary:'발송목록 고정'})
    @Patch('/fixSendList/:id')
    async fixSendList(@Param("id") id:number){
        this.logger.log('발송목록 고정');
        return await this.sendService.fixSendList(id);
    }

    @ApiOperation({summary:'발송목록 고정 해제'})
    @Patch('/cancelFix/:id')
    async cancelFix(@Param("id") id:number){
        this.logger.log('발송목록 고정 해제');
        return await this.sendService.cancelFix(id);
    }

    @ApiOperation({summary:'입금 파일 업로드'})
    @Post('/cashExcel')
    async cashExcel(@Body() insertCashDto : Array<InsertCashDto>){
        this.logger.log('입금 파일 업로드');
        return await this.erpService.cashExcel(insertCashDto);
    }
       
}
