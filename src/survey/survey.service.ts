import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma.service';
import { xml2json } from 'xml-js';
import { AddrSearchDto } from './Dto/addrSearch.dto';

@Injectable()
export class SurveyService {
  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

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
              id: true,
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
              id: true,
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

  async getAddrData(addrSearchDto: AddrSearchDto) {
    try {
      const keyword = addrSearchDto.keyword;
      // 키워드에 대한 금지어 처리(영어 혹은 특수문자)
      const regex = /[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
      if (regex.test(keyword)) {
        return {
          success: false,
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const page = addrSearchDto.page;
      const confmKey = process.env.ADDR_KEY;
      const url = `
        https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=${page}&countPerPage=10&keyword=${keyword}&confmKey=${confmKey}&returnType=json
      `;
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error: AxiosError) => {
            console.log('error', error);
            throw 'An error happend! in survey service!';
          }),
        ),
      );
      const jsonData = JSON.parse(xml2json(data, { compact: true, spaces: 4 }));
      const errorCode = jsonData.results.common.errorCode._text;
      const totalCount = jsonData.results.common.totalCount._text;
      if (errorCode === '0') {
        // 에러 코드 0이 정상
        if (totalCount === '1') {
          // 결과가 1개이면 배열에 안 담아서 줌
          return {
            success: true,
            status: HttpStatus.OK,
            data: {
              totalCount: totalCount,
              juso: [jsonData.results.juso],
            },
          };
        } else {
          return {
            success: true,
            status: HttpStatus.OK,
            data: {
              totalCount: totalCount,
              juso: jsonData.results.juso,
            },
          };
        }
      } else {
        return {
          success: false,
          status: HttpStatus.BAD_REQUEST,
        };
      }
    } catch (err) {
      this.logger.error(err);
      return {
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
