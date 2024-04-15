import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SurveyService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SurveyService.name);

  async getFirstVisitQuestion() {
    try {
      const res = await this.prisma.question.findMany({
        where: {
          type: 'first',
        },
        select: {
          id: true,
          question: true,
          type: true,
          choice: true,
          note: true,
          answers: {
            select: {
              answer: true,
            },
          },
        },
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
      const res = await this.prisma.question.findMany({
        where: {
          type: 'return',
        },
        select: {
          id: true,
          question: true,
          type: true,
          choice: true,
          note: true,
          answers: {
            select: {
              answer: true,
            },
          },
        },
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
