import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SurveyService } from './survey.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddrSearchDto } from './Dto/addrSearch.dto';
import { GetOrderDto } from './Dto/getOrder.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { OrderUpd } from 'src/auth/decorators/order.decorator';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';

@Controller('survey')
@UseFilters(new HttpExceptionFilter())
@ApiTags('설문 관련 api')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}
  private readonly logger = new Logger(SurveyController.name);

  @ApiOperation({ summary: '초진 설문' })
  @HttpCode(HttpStatus.OK)
  @Get('/new-patient')
  async getFirstVisitQuestion() {
    this.logger.log('초진 설문');
    const res = await this.surveyService.getFirstVisitQuestion();
    if (res.success) return res;
    else throw new HttpException('', res.status);
  }

  @ApiOperation({ summary: '재진 설문' })
  @HttpCode(HttpStatus.OK)
  @Get('/returning-patient')
  async getReturningQuestion() {
    this.logger.log('재진 설문');
    const res = await this.surveyService.getReturningQuestion();
    if (res.success) return res;
    else throw new HttpException('', res.status);
  }

  @ApiOperation({ summary: '주소 검색 오픈 API' })
  @HttpCode(HttpStatus.OK)
  @Post('/addr')
  async getAddrData(@Body() addrSearchDto: AddrSearchDto) {
    this.logger.log('주소 검색 오픈 API');
    const res = await this.surveyService.getAddrData(addrSearchDto);
    if (res.success) return res;
    else throw new HttpException('', res.status);
  }

  @ApiOperation({summary:'주문 조회'})
  @OrderUpd()
  @Get('/getMyOrder')
  async getMyOrder(@Query() queryData){
    this.logger.log('오더 조회');
    const { name, phoneNum } = queryData;
    const getOrderDto:GetOrderDto = {name,phoneNum};
    console.log(getOrderDto);
    return await this.surveyService.getMyOrder(getOrderDto);
  }

  @ApiOperation({summary:'오더 업데이트 용 질문 조회'})
  @OrderUpd()
  @Get('/updateSurvey')
  async updateSurvey(){
    this.logger.log('오더 업데이트 용 질문 가져오기');
    return await this.surveyService.updateSurvey();
  }

  @ApiOperation({summary:'아이템들만 조회하기'})
  @UseGuards(AuthGuard)
  @Get('/getItem')
  async getItems() {
    this.logger.log('아이템들만 조회하기');
    return await this.surveyService.getItems();
  }
}
