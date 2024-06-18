import { Controller, Get, Logger, Query, UseFilters,Headers, HttpException, Body, Post, Patch, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { TalkService } from './talk.service';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { OrderInsertTalk } from './Dto/orderInsert.dto';

@Controller('talk')
@UseFilters(new HttpExceptionFilter())
@ApiTags('카톡 발송 관련 엑셀 api')
export class TalkController {
    constructor(
        private readonly talkService: TalkService
    ){}

    private readonly logger = new Logger(TalkController.name);

    @ApiOperation({summary:'접수 알림톡 엑셀 데이터 출력'})
    @Get('/orderInsertTalk')
    async orderInsertTalk(@Query() getListDto: GetListDto, @Headers() header) {
        this.logger.log('접수 알림톡 엑셀 데이터 출력');
        const res = await this.talkService.orderInsertTalk(getListDto);

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

    @ApiOperation({summary:'접수 알림톡 발송 완료 처리'})
    @Post('/orderInsertTalk')
    async orderTalkUpdate(@Body() orderInsertDto: OrderInsertTalk) {
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

    @ApiOperation({summary:'상담 연결 안된 사람들 엑셀 데이터'})
    @Get('/notConsulting')
    async notConsulting(@Query() getListDto: GetListDto, @Headers() header) {
        this.logger.log('상담 연결 안된 사람들 엑셀 데이터');
        const res = await this.talkService.notConsulting(getListDto);
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

    @ApiOperation({summary:'미입금 된 인원 엑셀 데이터'})
    @Get('/notPay')
    async notPay(@Query() getListDto: GetListDto, @Headers() header){
        this.logger.log('미입금 된 인원 엑셀 데이터');
        const res = await this.talkService.notConsulting(getListDto);
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
}
