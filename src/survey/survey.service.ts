import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SurveyService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SurveyService.name);

  async getFirstVisitQuestion() {
    try {
      let res: Array<any> = await this.prisma.$queryRaw`
        SELECT
          q.id,
          q.question,
          q.type,
          q.choice,
          q.note,
          GROUP_CONCAT(a.anwer SEPARATOR '//') as answer
        FROM question q
        LEFT JOIN answer a
        ON q.id = a.questionId
        WHERE type = "first"
        GROUP BY q.id, q.question;
      `;

      res.forEach((e) => {
        if (e.answer) e.answer = e.answer.split('//');
      });

      return { success: true, status: HttpStatus.OK, data: res };
    } catch (err) {
      this.logger.error(err);
      return {
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getReturningQuestion() {
    try {
      const res: Array<any> = await this.prisma.$queryRaw`
        SELECT
          q.id,
          q.question,
          q.type,
          q.choice,
          q.note,
        GROUP_CONCAT(a.anwer SEPARATOR '//') as answer
        FROM question q
        LEFT JOIN answer a
        ON q.id = a.questionId
        WHERE type = "return"
        GROUP BY q.id, q.question;
      `;

      res.forEach((e) => {
        if (e.answer) e.answer = e.answer.split('//');
      });

      return { success: true, status: HttpStatus.OK, data: res };
    } catch (err) {
      this.logger.error(err);
      return {
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
