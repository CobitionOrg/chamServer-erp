import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
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
                data:{
                    orderSortNum:-1,
                    consultingFlag: true,
                }
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
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
                    payFlag: true,
                    addr:true,
                    isPickup: true,
                    price: true,
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
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    /**
     * 방문 수령 계좌 결제 처리
     * @param id 
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async accountPay(id){
        try{
            //계좌 결제는 장부에 올라가야 되기 때문에 금액을 0원 처리하지 않고
            //결제 처리를 해준다.
            await this.prisma.order.update({
                where:{
                    id:id
                },
                data:{
                    payFlag:1
                }
            });

            return {success:true,status:HttpStatus.CREATED,msg:'완료'};

        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    /**
     * 방문 수령 방문 결제 처리
     * @param id 
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async visitPay(id: number) {
        try{
            //방문 결제는 장부에 올라가지 않기 때문에 금액을 0원 처리한다.

            await this.prisma.order.update({
                where:{
                    id:id
                },
                data:{
                    payFlag:1,
                    price:0
                }
            });

            return {success:true,status:HttpStatus.CREATED,msg:'완료'};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부 서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}