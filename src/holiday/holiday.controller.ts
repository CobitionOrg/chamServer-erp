import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { LogService } from 'src/log/log.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { AuthGuard } from 'src/auth/auth.guard';
import { GetDateDto } from './Dto/getDate.dto';
import { PostDateDto } from './Dto/postDate.dto';

@Controller('holiday')
@UseFilters(new HttpExceptionFilter())
@UseGuards(AuthGuard)
@ApiTags('CRUD holidays')
export class HolidayController {
  constructor(
    private readonly holidayService: HolidayService,
    private readonly logService: LogService,
  ) {}

  private readonly logger = new Logger(HolidayController.name);

  @ApiOperation({ summary: '선택한 년, 월의 휴일 받아오기' })
  @Get('/')
  async getHolidaysByYearMonth(@Query() getDateDto: GetDateDto) {
    this.logger.log('휴일 조회');
    const res = await this.holidayService.getHolidaysByYearMonth(getDateDto);

    return res;
  }

  @ApiOperation({ summary: '휴일 추가 및 수정' })
  @Post('/')
  async postHolidays(@Body() postDateDto: PostDateDto, @Headers() header) {
    this.logger.log('휴일 추가');
    const res = await this.holidayService.postHolidays(postDateDto);

    // if (res.success) {
    //   const { year, month, date } = dateDto;
    //   await this.logService.createLog(
    //     `${year}-${month}-${date} 휴일 추가`,
    //     '관리자 페이지',
    //     header,
    //   );
    // }

    return res;
  }
}
