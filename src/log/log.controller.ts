import { Controller, Get, Logger, Param, Query, UseGuards } from '@nestjs/common';
import { LogService } from './log.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiOperation } from '@nestjs/swagger';

@Controller('log')
@UseGuards(AuthGuard)
export class LogController {
    constructor(
      private readonly logSerive: LogService  
    ){}

    private readonly logger = new Logger(LogController.name);

    @ApiOperation({summary:'로그 조회'})
    @Get('/readLog')
    async readLog(
      @Query('year') year? : number,
      @Query('month') month? : number,
      @Query('day') day? : number,
      @Query('userName') userName? : string
    ){
      console.log(userName);
      if(day==null){
        return month == null ?
          await this.logSerive.readLogAtYear(year)
         :await this.logSerive.readLogAtMonth(month,year);
      }else{
        return await this.logSerive.readLogAtDay(day,month,year,userName);
      }
    }

    @ApiOperation({summary:'사용자 이름으로 조회'})
    @Get('/readLog/:userName')
    async readLogById(@Param("userName") userName:string){
      return await this.logSerive.readLogById(userName);
    }
}
