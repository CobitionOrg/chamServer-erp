import { Body, Controller, Get, Headers, HttpException, HttpStatus, Logger, Param, Post, Query, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto } from './Dto/createExchange.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { CompleteRefundDto } from './Dto/completeRefund.dto';

@Controller('exchange')
@UseFilters(new HttpExceptionFilter())
@ApiTags('About exchange, refund, omission')
export class ExchangeController {
    constructor(
        private readonly exchangeService: ExchangeService
    ) { }

    private readonly logger = new Logger(ExchangeController.name);

    @Get()
    async check() {
        return 'check';
    }

    @ApiOperation({ summary: '교환,환불,누락 건으로 새 오더 생성' })
    @Post('/createExchange')
    async createExchange(@Body() createExchangeDto: CreateExchangeDto) {
        const res:any = await this.exchangeService.createExchange(createExchangeDto);
        if (res.status != 201) {
            throw new HttpException({
                success: false,
                status: res.status,
                msg: res.msg
            },
                res.status
            );
        }

        return {success:true, status:HttpStatus.CREATED};
    } 

    @ApiOperation({summary: '교환 환불,누락 오더 리스트 가져오기'})
    @Get('/getExchangeList')
    async getExchageList(@Query() getListDto : GetListDto, @Headers() Header){
        const res:any = await this.exchangeService.getExchangeList(getListDto);
        if(res.status != 200){
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

    @ApiOperation({summary:'환불 완료 처리'})
    @Post('/completeRefund')
    async completeRefund(@Body('id') completeRefundDto : CompleteRefundDto, @Headers() Headers){
        const res:any = await this.exchangeService.completeRefund(completeRefundDto);
        
        if(res.status != 200){
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
}
