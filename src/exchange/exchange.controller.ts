import { Body, Controller, Get, HttpException, HttpStatus, Logger, Post, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto } from './Dto/createExchange.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';

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
    async getExchageList(){
        const res:any = await this.exchangeService.getExchangeList();
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
