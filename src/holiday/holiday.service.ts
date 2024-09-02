import { Injectable, Logger } from '@nestjs/common';
import { HolidayRepository } from './holiday.repository';
import { PrismaService } from 'src/prisma.service';
import { GetDateDto } from './Dto/getDate.dto';
import { PostDateDto } from './Dto/postDate.dto';

@Injectable()
export class HolidayService {
  constructor(
    private readonly holidayRepository: HolidayRepository,
    private prisma: PrismaService,
  ) {}

  private readonly logger = new Logger(HolidayService.name);

  /**
   * 휴일 조회
   * @param getDateDto
   * @returns {success:boolean, status:HttpStatus, list }
   */
  async getHolidaysByYearMonth(getDateDto: GetDateDto) {
    let year = Number(getDateDto.year);
    let month = Number(getDateDto.month);

    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextYear++;
      nextMonth = 1;
    }

    const yearString = year.toString();
    const nextYearString = nextYear.toString();
    const monthString = month.toString().padStart(2, '0');
    const nextMonthString = nextMonth.toString().padStart(2, '0');

    const startDate = new Date(`${yearString}-${monthString}-01T00:00:00.000Z`);
    const endDate = new Date(`${nextYearString}-${nextMonthString}-01T00:00:00.000Z`);

    const res = await this.holidayRepository.getHolidaysByYearMonth(
      startDate,
      endDate,
    );

    return res;
  }

  /**
   * 휴일 추가 및 수정
   * @param postDateDto
   * @returns {success:boolean, status:HttpStatus }
   */
  async postHolidays(postDateDto: PostDateDto) {
    let res;

    let year = postDateDto.year;
    let month = postDateDto.month;

    let nextYear = postDateDto.year;
    let nextMonth = postDateDto.month + 1;
    if (nextMonth > 12) {
      nextYear++;
      nextMonth = 1;
    }

    const yearString = year.toString();
    const nextYearString = nextYear.toString();
    const monthString = month.toString().padStart(2, '0');
    const nextMonthString = nextMonth.toString().padStart(2, '0');

    const startDate = new Date(`${yearString}-${monthString}-01T00:00:00.000Z`);
    const endDate = new Date(`${nextYearString}-${nextMonthString}-01T00:00:00.000Z`);

    let days = [];
    if (postDateDto.days.length === 0) {
      res = await this.holidayRepository.deleteHolidaysByYearMonth(
        startDate,
        endDate,
      );
    } else {
      days = postDateDto.days.map((date) => date.toString().padStart(2, '0'));
      const daysAsDates = days.map(
        (day) => new Date(`${year}-${month}-${day}T00:00:00.000Z`),
      );
      res = await this.holidayRepository.postHolidays(
        startDate,
        endDate,
        daysAsDates,
      );
    }

    return res;
  }
}
