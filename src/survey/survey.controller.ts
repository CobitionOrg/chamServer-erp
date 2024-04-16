import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SurveyService } from './survey.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('survey')
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
    else
      throw new HttpException('SERVER ERROR in survey/new-patient', res.status);
  }

  @ApiOperation({ summary: '재진 설문' })
  @HttpCode(HttpStatus.OK)
  @Get('/returning-patient')
  async getReturningQuestion() {
    this.logger.log('재진 설문');
    const res = await this.surveyService.getReturningQuestion();
    if (res.success) return res;
    else
      throw new HttpException(
        'SERVER ERROR in survey/returning-patient',
        res.status,
      );
  }
}
