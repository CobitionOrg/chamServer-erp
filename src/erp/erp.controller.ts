import { Body, Controller, Get, Headers, Logger, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

@Controller('erp')
@UseGuards(AuthGuard)
@ApiTags('erp api')
export class ErpController {
    constructor(
        private erpService : ErpService,
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
    async getReciptList(){
       this.logger.log('오더 리스트 조회');
       return await this.erpService.getReciptList(); 
    }

    @ApiOperation({summary:'유선 상담 목록으로 변경'})
    @Post('/callConsulting')
    async callConsulting(@Body() callConsultingDto : CallConsultingDto){
        this.logger.log('유선 상담 목록으로 이동');
        return await this.erpService.callConsulting(callConsultingDto);
    }

    @ApiOperation({summary:'유선 상담 목록 조회'})
    @Get('/callConsulting')
    async getCallList(@Headers() header){
        this.logger.log('유선 상담 목록 조회');
        return await this.erpService.getCallList(getToken(header));
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

    @Public()
    @Get('/s3')
    async s3Test(){
        return await this.erpService.s3Url();
    }

    @ApiOperation({summary:'발송 목록 조회'})
    @Get('/sendList')
    async getSendList(){
        this.logger.log('발송 목록 리스트');
        return await this.erpService.getOrderTempList();
    }

    @ApiOperation({summary:'발송 단일 데이터 조회'})
    @Get('/sendOne/:id')
    async sendOne(@Param("id") id:number){
        this.logger.log('발송 단일 데이터 조회');
        return await this.erpService.getOrderTempOne(id);
    }

    @ApiOperation({summary:'발송 목록 세팅'})
    @Public()
    @Get('/setSendList')
    async setSendList(){
        this.logger.log('발송 목록 세팅');
        return await this.erpService.setSendList();
    }

    @ApiOperation({summary:'발송목록에서 오더 수정'})
    @Patch('/updateSendOrder')
    async updateSendOrder(@Body() surveyDto : UpdateSurveyDto){
        this.logger.log('발송목록에서 오더 수정');
        console.log(surveyDto);
    }
}
