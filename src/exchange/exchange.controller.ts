import { Body, Controller, Get, Headers, HttpException, HttpStatus, Logger, Param, Patch, Post, Query, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto } from './Dto/createExchange.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { CompleteRefundDto } from './Dto/completeRefund.dto';
import { LogService } from 'src/log/log.service';

@Controller('exchange')
@UseFilters(new HttpExceptionFilter())
@ApiTags('About exchange, refund, omission')
export class ExchangeController {
    constructor(
        private readonly exchangeService: ExchangeService,
        private readonly logService: LogService,
    ) { }

    private readonly logger = new Logger(ExchangeController.name);

    @Get()
    async check() {
        return 'check';
    }

    @ApiOperation({ summary: '교환,환불,누락 건으로 새 오더 생성' })
    @Post('/createExchange')
    async createExchange(@Body() createExchangeDto: CreateExchangeDto, @Headers() Header) {
        const res: any = await this.exchangeService.createExchange(createExchangeDto);
        if (res.status != 201) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }
        await this.logService.createLog(
            `${createExchangeDto.id}번 교환,환불,누락 건으로 새 오더 생성`,
            '교환/환불/누락목록',
            Header
        );
        return { success: true, status: HttpStatus.CREATED };
    }

    @ApiOperation({ summary: '교환 환불,누락 오더 리스트 가져오기' })
    @Get('/getExchangeList')
    async getExchageList(@Query() getListDto: GetListDto, @Headers() Header) {
        const res: any = await this.exchangeService.getExchangeList(getListDto);
        if (res.status != 200) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return res;
    }

    @ApiOperation({ summary: '환불 완료 처리' })
    @Post('/completeRefund')
    async completeRefund(@Body() completeRefundDto: CompleteRefundDto, @Headers() Header) {
        const res: any = await this.exchangeService.completeRefund(completeRefundDto);

        if (res.status != 200) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }
        await this.logService.createLog(
            `${completeRefundDto.orderId}번 환불 완료 처리`,
            '교환/환불/누락목록',
            Header
        );

        return res;

    }



}
