import { Controller, Get, HttpException, Logger, Headers, Param, Patch, Query, UseFilters, UseGuards } from '@nestjs/common';
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
    ) { }

    private readonly logger = new Logger(VisitController.name);

    @ApiOperation({ summary: '방문수령 주문으로 변경' })
    @Patch('/visitOrder/:id')
    async visitOrder(@Param('id') id: number) {
        this.logger.log('방문수령 주문으로 변경');
        const res = await this.visitService.visitOrder(id);

        return res;
    }

    @ApiOperation({ summary: '방문수령 조회' })
    @Get('/visitList')
    async visitList(@Query() getListDto: GetListDto, @Headers() header) {
        this.logger.log('방문수령 조회');
        const res = await this.visitService.visitList(getListDto);

        return res;
    }

    /***
 * 방문 수령인데 계좌로 입금한 애들만 금액을 넣어줌
 * 방문 결제는 무조건 0원으로 바꿈 -> 해당 금액 결제처리
 * 계좌 결제는 해당 금액 결제 처리
 * 발송목록으로 넘기고 싶은 애들만 발송일자 선택해서 입금 완료 처리 버튼 누르기
 * 따라서 결제 완료 버튼 없어짐
 */

    @ApiOperation({ summary: '방문 수령 계좌 결제 처리' })
    @Patch('/accountPay/:id')
    async accountPay(@Param('id') id: number) {
        this.logger.log('방문 수령 계좌 결제 처리');
        const res = await this.visitService.accountPay(id);

        return res;
    }

    @ApiOperation({summary:'방문 수령 방문 결제 처리'})
    @Patch('/visitPay/:id')
    async visitPay(@Param("id") id: number) {
        this.logger.log('방문 수령 방문 결제 처리');
        const res = await this.visitService.visitPay(id);

        return res;
        
    }

}
