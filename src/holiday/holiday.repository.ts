import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class HolidayRepository {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(HolidayRepository.name);

  async getHolidaysByYearMonth(startDate: Date, endDate: Date) {
    try {
      const list = await this.prisma.holiday.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
          useFlag: true,
        },
      });

      return { success: true, status: HttpStatus.OK, list };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          msg: '내부서버 에러',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async postHolidays(startDate: Date, endDate: Date, days: Date[]) {
    try {
      await this.deleteHolidaysByYearMonth(startDate, endDate);

      await Promise.all(
        days.map(async (date) => {
          const existingHoliday = await this.prisma.holiday.findFirst({
            where: {
              date: date,
            },
          });

          if (existingHoliday) {
            // DB에 존재 시 useFlag: true
            await this.prisma.holiday.update({
              where: {
                id: existingHoliday.id,
              },
              data: {
                useFlag: true,
              },
            });
          } else {
            // DB에 없을 시 새로 생성
            await this.prisma.holiday.create({
              data: {
                date: date,
                useFlag: true,
              },
            });
          }
        }),
      );

      return { success: true, status: HttpStatus.OK };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          msg: '내부서버 에러',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteHolidaysByYearMonth(startDate: Date, endDate: Date) {
    try {
      const holidays = await this.prisma.holiday.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
          useFlag: true,
        },
      });

      if (holidays.length === 0) {
        return { success: true, status: HttpStatus.OK };
      }

      await this.prisma.holiday.updateMany({
        where: {
          id: {
            in: holidays.map((holiday) => holiday.id),
          },
        },
        data: {
          useFlag: false,
        },
      });

      return { success: true, status: HttpStatus.OK };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          msg: '내부서버 에러',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
