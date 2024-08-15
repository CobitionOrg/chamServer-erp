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
    const year = getDateDto.year;
    const month = getDateDto.month.padStart(2, '0');
    const nextMonth = (Number(getDateDto.month) + 1)
      .toString()
      .padStart(2, '0');

    // console.log('year', year);
    // console.log('month', month);
    // console.log('nextMonth', nextMonth);

    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-${nextMonth}-01T00:00:00.000Z`);

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

    const year = postDateDto.year.toString();
    const month = postDateDto.month.toString().padStart(2, '0');
    const nextMonth = (postDateDto.month + 1).toString().padStart(2, '0');

    // console.log(year, typeof year);
    // console.log(month, typeof month);
    // console.log(nextMonth, typeof nextMonth);

    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-${nextMonth}-01T00:00:00.000Z`);

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
