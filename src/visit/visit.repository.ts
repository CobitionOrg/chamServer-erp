import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class VisitRepository {
    constructor(
        private prisma: PrismaService,
    ){}

    private readonly logger = new Logger(VisitRepository.name);

    /**
     * 방문수령 처리
     * @param id 
     * @returns 
     */
    async visitOrder(id: number) {
        try{
            await this.prisma.order.update({
                where:{id:id},
                data:{orderSortNum:-1}
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status : HttpStatus.INTERNAL_SERVER_ERROR
            }

        }
    }

    /**
     * 방문 수령 리스트 불러오기
     * @param orderConditions 
     * @param patientConditions 
     * @returns 
     */
    async visitList(orderConditions, patientConditions){
        try{
            const list = await this.prisma.order.findMany({
                where:{
                    orderSortNum:-1,
                    isComplete: false,
                    ...orderConditions,
                    ...patientConditions
                },
                select:{
                    id: true,
                    route: true,
                    message: true,
                    cachReceipt: true,
                    typeCheck: true,
                    consultingTime: true,
                    payType: true,
                    outage: true,
                    consultingType: true,
                    phoneConsulting: true,
                    isFirst: true,
                    date: true,
                    orderSortNum: true,
                    remark: true,
                    addr:true,
                    isPickup: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        }
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        }
                    },

                }
            });

            return {success:true, list, status:HttpStatus.OK};

        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status : HttpStatus.INTERNAL_SERVER_ERROR
            }

        }
    }
}