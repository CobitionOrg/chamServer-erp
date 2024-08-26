import { HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { LogRepository } from './log.repository';
import { getToken } from 'src/util/token';
@Injectable()
export class LogService {
    constructor(
        private jwtService: JwtService,
        private readonly logRepository : LogRepository,
        private prisma: PrismaService,

    ){}

    private readonly logger = new Logger(LogService.name);

    /**
     * 로그 생성
     * @param log 
     * @param stage 
     * @param header 
     * @returns {success:boolean,status:number}
     */
    async createLog(log:string,stage:string,header){
        const date = new Date();
        let res;
        if(header!=null){
            const token = await this.jwtService.decode(getToken(header));
            res = await this.logRepository.createLog(log,date,stage,token.sub);
        } else {
            // const id = await this.prisma.user.findFirst({
            //     where: {
            //         grade: "admin"
            //     },
            //     select:
            //     {
            //         id:true
            //     }
            // });
            // res= await this.logRepository.createLog(log,date,stage,id.id);
            res= await this.logRepository.createLog(log,date,stage,5);

        }
        if(res.success){
            return {success:true,status:res.status}
        }else{
            throw new InternalServerErrorException();
        }
    }

    /**
     * 특정 일 로그 조회
     * @param day 
     * @param month 
     * @param year 
     * @returns 
     */
    async readLogAtDay(day:number, month: number, year:number, userName:string|null){
        const startDate = new Date(year, month-1, day, 0, 0, 0);
        const endDate = new Date(year, month-1, day, 23, 59, 59);

        const res = await this.logRepository.readLog(startDate, endDate, userName);

        if(res.success){
            return res;
        }else{
            throw new InternalServerErrorException();
        }
    }

    /**
     * 특정 달 로그 조회
     * @param month 
     * @param year 
     * @returns 
     */
    async readLogAtMonth(month:number,year:number){
        const startDate = new Date(year,month-1,1);
        const endDate = new Date(year,month,1);

        const res = await this.logRepository.readLog(startDate, endDate);

        if(res.success){
            return res;
        }else{
            throw new InternalServerErrorException();
        }

    }

    /**
     * 특정 연도 로그 조회
     * @param year 
     * @returns  list: {
                log: string;
                id: number;
                DateTime: Date;
                stage: string;
                user: {
                    userId: string;
                    grade: $Enums.Role;
                };
            }[];
            status: HttpStatus;
            success: boolean;
        } | {
            success: boolean;
            status: HttpStatus;
            list?: undefined;
        }
     */
    async readLogAtYear(year:number){
        const startDate = new Date(year, 0, 1, 0, 0, 0);
        const endDate = new Date(year + 1, 0, 1, 0, 0, 0);

        const res = await this.logRepository.readLog(startDate, endDate);

        if(res.success){
            return res;
        }else{
            throw new InternalServerErrorException();
        }
    }

    /**
     * 유저 아이디로 조회하기
     * @param userId 
     * @returns Promise<{
            list: {
                id: number;
                log: string;
                DateTime: Date;
                stage: string;
                userId: number;
            }[];
            status: HttpStatus;
            success: boolean;
        } | {
            success: boolean;
            status: HttpStatus;
            list?: undefined;
        }>
     */
    async readLogById(userName:string){
        return await this.logRepository.readLogById(userName);
    }
}
