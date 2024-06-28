import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma.service';
import { xml2json } from 'xml-js';
import { AddrSearchDto } from './Dto/addrSearch.dto';
import { GetOrderDto } from './Dto/getOrder.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { sortAllItems, sortItems } from 'src/util/sortItems';
import { Crypto } from 'src/util/crypto.util';

@Injectable()
export class SurveyService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly httpService: HttpService,
    private crypto: Crypto,
  ) { }

  private readonly logger = new Logger(SurveyService.name);

  /**
   * 초진용 질문
   * @returns 
   */
  async getFirstVisitQuestion() {
    try {
      const res = await this.prisma.question.findMany({
        where: {
          type: 'first',
          useFlag: 1
        },
        select: {
          id: true,
          question: true,
          type: true,
          choice: true,
          note: true,
          questionCode: true,
          orderType: true,
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
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 재진용 질문
   * @returns 
   */
  async getReturningQuestion() {
    try {
      const res = await this.prisma.question.findMany({
        where: {
          type: 'return',
          useFlag: 1
        },
        select: {
          id: true,
          question: true,
          type: true,
          choice: true,
          note: true,
          questionCode: true,
          orderType: true,
          answers: {
            select: {
              id: true,
              answer: true,
            },
          },
        },
      });

      console.log(res);
      return { success: true, status: HttpStatus.OK, data: res };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 주문 항목 전부 가져오기
   * @returns 
   */
  async getAllItem(){
    try{
      const common = await this.prisma.item.findMany({
        where:{isCommon:true},
        orderBy: [
          { item: 'asc' },
          { id: 'asc' },
        ],
        select: {id:true,item:true}
      });

      const sortedItems = common.sort((a,b) => sortAllItems(a,b));

      const yoyo = await this.prisma.item.findMany({
        where:{isYoyo:true, isCommon:false},
        orderBy:{item:'asc'},
        select:{item:true}
      });

      return {success:true,status:HttpStatus.OK, common:sortedItems, yoyo};
    }catch(err){
      this.logger.error(err);
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAddrData(addrSearchDto: AddrSearchDto) {
    try {
      const keyword = addrSearchDto.keyword;
      // 키워드에 대한 금지어 처리(영어 혹은 특수문자) hyphen(-)은 가능
      const regex = /[a-zA-Z!@#$%^&*()_+\=\[\]{};':"\\|,.<>\/?]/;
      if (regex.test(keyword)) {
        return {
          success: false,
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const page = addrSearchDto.page;
      const confmKey = process.env.ADDR_KEY;
      const url = `
        https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=${page}&countPerPage=30&keyword=${keyword}&confmKey=${confmKey}&returnType=json
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
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 오더 업데이트 질문만 가져오기
   * @returns 
   */
  async updateSurvey() {
    try {
      const res = await this.prisma.question.findMany({
        where: {
          type: 'first',
          useFlag: 1,
          id: {
            in: [7, 8, 9, 10]
          }
        },
        select: {
          id: true,
          question: true,
          type: true,
          choice: true,
          note: true,
          questionCode: true,
          orderType: true,
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
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 내 오더 조회
   * @param getOrderDto 
   * @returns
   *  {
          id: number;
          patient: {
              id: number;
              name: string;
              addr: string;
          };
          payType: string;
          isComplete: boolean;
          orderItems: {
              type: $Enums.ItemType;
              item: string;
          }[];
      }
   */
  async getMyOrder(getOrderDto: GetOrderDto) {
    try {
      const res = await this.getUserId(getOrderDto);

      if(!res.success) {
        return { success: false, msg: '주문하신 내역이 없습니다' };
      }

      const order = await this.prisma.order.findFirst({
        where: {
          patientId: res.id,
          isComplete: false
        },
        select: {
          id: true,
          payType: true,
          isComplete: true,
          patient: {
            select: {
              id: true,
              name: true,
              addr: true,
            }
          },
          orderItems: {
            select: {
              item: true,
              type: true,
            }
          }
        }

      });
      console.log(order);

      if (!order) {
        return { success: false, msg: '주문하신 내역이 없습니다' };
      }

      //조회 용 토큰 발행
      const payload = {
        patientId: order.patient.id,
        orderId: order.id
      };

      const orderUpd_token = await this.jwtService.signAsync(payload)

      return { success: true, order, token: orderUpd_token }
    } catch (err) {
      this.logger.error(err);
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 유저 아이디 값 조회
   * @param getOrderDto 
   * @returns {
   *  success: boolean;
      id: number;
      status?: undefined;
    }
   */
  async getUserId(getOrderDto: GetOrderDto) {
    try {
      const res = await this.prisma.patient.findMany({
        where: {
          name: getOrderDto.name,
        },
        select: {
          id: true,
          phoneNum: true,
        }
      });

      let check = false;
      let matched: any = {};

      for(const e of res) {
        const checkPhoneNum = this.crypto.decrypt(e.phoneNum);
        if(checkPhoneNum === getOrderDto.phoneNum) {
          matched = { ...e };
          check = true;
          break;
        }
      }

      return { success: check, id: matched.id }
    } catch (err) {
      this.logger.error(err);
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 아이템들만 조회하기
   * @returns 
   */
  async getItems() {
    try {
      const list = await this.prisma.item.findMany({
        select: {
          item: true,
          isFirst: true,
          isYoyo: true,
          isQuestion: true,
        }
      });

      return { success: true, list };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR
      },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
