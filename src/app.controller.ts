import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

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

}
