import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { GetListDto } from './erp/Dto/getList.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello() {
    return await this.appService.getTalkExcel();
  }

  // @Get('/test')
  // async test() {
  //   return await this.appService.test();
  // }

  @Get('/mail')
  async mailTest() {
    return await this.appService.mailTest();
  }

  @Get('/excelCash')
  async cashExcel(@Query() getListDto: GetListDto) {
    const res = await this.appService.cashExcelTest(getListDto);
  }

}
