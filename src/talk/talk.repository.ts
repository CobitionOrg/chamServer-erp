import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { GetListDto } from "src/erp/Dto/getList.dto";
import { PrismaService } from "src/prisma.service";
import { getKstDate } from "src/util/getKstDate";

@Injectable()
export class TalkRepositoy{
    constructor(
        private prisma: PrismaService
    ){}

    private readonly logger = new Logger(TalkRepositoy.name);

    /**
     * 접수 알림 톡 대상 데이터 가져오기
     * @param getListDto 
     * @returns Promise<{
            success: boolean;
            list: {
                id: number;
                patient: {
                    name: string;
                    phoneNum: string;
                };
            }[];
            status: HttpStatus;
        }>
     */
    async orderInsertTalk(getListDto: GetListDto) {
        try{
            const {startDate, endDate} = getKstDate(getListDto.date);
            let orderConditions = {
                date: {
                    gte: startDate,
                    lt: endDate,
                }
            }
            const list = await this.prisma.order.findMany({
                where: {...orderConditions, orderSortNum:{gte:0},talkFlag:false},
                select: {
                    id:true,
                    patient:{select:{name:true,phoneNum:true},}
                }
            });
            
            

            return {success:true, list, status:HttpStatus.OK};
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
    
    async completeInsertTalk(list){
        try{    
            for(const e of list) {
                await this.prisma.order.update({
                    where:{id:e},
                    data:{talkFlag:true},
                });
            }

            return {success:true,status:HttpStatus.OK}
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
}