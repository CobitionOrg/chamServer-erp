import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class LogRepository{
    constructor(
        private prisma: PrismaService,
    ){}

    private readonly logger = new Logger(LogRepository.name);

    /**
     * 로그 생성
     * @param log  
     * @param DateTime 
     * @param stage 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async createLog(log:string, DateTime:Date, stage:string, userId :number){
        try{    
            await this.prisma.log.create({
                data:{
                    log,DateTime,stage,userId
                }
            });

            return {success:true,status:HttpStatus.OK}
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 해당 시간대 사이 로그 검색
     * @param startDate 
     * @param endDate 
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
    async readLog(startDate:Date, endDate:Date,userName?){
        try{
            console.log('=============');
            console.log(userName);
            const res = await this.prisma.log.findMany({
                where: {
                    DateTime:{
                        gte:startDate,
                        lt:endDate
                    },
                    user:{
                        name:{contains:userName}
                    }
                },
                select:{
                    id:true,
                    log:true,
                    DateTime:true,
                    stage:true,
                    user:{
                        select:{userId:true,grade:true,name:true}
                    }
                },
                orderBy:
                {
                    DateTime:'desc'
                }
            });

            return {list:res,status:HttpStatus.OK,success:true}
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status : HttpStatus.INTERNAL_SERVER_ERROR
            }
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
        try{
            const res = await this.prisma.log.findMany({
                where:{
                    user:{name:userName}
                },
                select:{
                    id:true,
                    log:true,
                    DateTime:true,
                    stage:true,
                    user:{
                        select:{userId:true,grade:true,name:true}
                    }
                }
            });

            return {list:res,status:HttpStatus.OK,success:true}
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }
}