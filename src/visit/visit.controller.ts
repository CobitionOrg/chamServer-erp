import { Controller, Get, HttpException, Logger,Headers, Param, Patch, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { VisitService } from './visit.service';
import { GetListDto } from 'src/erp/Dto/getList.dto';

@Controller('visit')
@UseFilters(new HttpExceptionFilter())
@ApiTags('log')
@UseGuards(AuthGuard)
export class VisitController {
    constructor(
        private readonly visitService: VisitService
    ){}

    private readonly logger = new Logger(VisitController.name);

    @ApiOperation({summary:'방문수령 주문으로 변경'})
    @Patch('/visitOrder/:id')
    async visitOrder(@Param('id') id: number){
        this.logger.log('방문수령 주문으로 변경');
        const res = await this.visitService.visitOrder(id);

        return res;
    }

    @ApiOperation({summary:'방문수령 조회'})
    @Get('/visitList')
    async visitList(@Query() getListDto: GetListDto, @Headers() header){
        
    }

}
