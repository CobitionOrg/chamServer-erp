import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { ExOrderObjDto } from "./Dto/exOrderObj.dto";
import { ExOrderItemObjDto } from "./Dto/exOrderItemObj.dto";
import { ExOrderBodyTypeDto } from "./Dto/exOrderBodyType.dto";
import { getCurrentDateAndTime } from "src/util/kstDate.util";

@Injectable()
export class ExchangeRepository {
    constructor(
        private prisma: PrismaService
    ) { }

    private readonly logger = new Logger(ExchangeRepository.name);

    /**
     * 이 전 주문 데이터 조회
     * @param id 
     * @param tx 
     * @returns 
     */
    async getExOrder(id: number, tx) {
        try {
            const exOrder = await tx.order.findUnique({
                where: { id: id },
                select: {
                    route: true,
                    message: true,
                    cachReceipt: true,
                    isFirst:true,
                    typeCheck: true,
                    consultingTime: true,
                    payType: true,
                    essentialCheck: true,
                    outage: true,
                    patient: {
                        select:{
                            id:true,
                            patientBodyType:true,
                        }
                    },
                    addr:true,
                    price: true,
                    remark: true,
                    orderItems: {
                        select:{
                            item:true,type:true
                        }
                    },
                }
            });

            console.log(exOrder);

            return exOrder;
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 오더 생성
     * @param tx 
     * @param objOrder 
     * @param orderSortNum 
     * @returns {success:boolean, id:number}
     */
    async insertOrder(tx, objOrder:ExOrderObjDto, orderSortNum:number){
        try{
            const newOrder = await tx.order.create({
                data:{
                    route: objOrder.route,
                    message: objOrder.message,
                    outage: objOrder.outage,
                    payType: objOrder.payType,
                    cachReceipt: objOrder.cachReceipt,
                    isFirst: false,
                    patientId : objOrder.patientId,
                    typeCheck: objOrder.typeCheck,
                    consultingTime: objOrder.consultingTime,
                    essentialCheck: objOrder.essentialCheck,
                    price: objOrder.price,
                    addr: objOrder.addr,
                    date: getCurrentDateAndTime(),
                    orderSortNum: orderSortNum
                }
            });

            return {success:true,id:newOrder.id};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 오더 아이템 생성
     * @param tx 
     * @param objOrderItems 
     * @param orderId 
     * @returns {success:boolean}
     */
    async insertOrderItems(tx,objOrderItems:Array<ExOrderItemObjDto>,orderId:number){
        try{
            const qryArr = [];

            objOrderItems.forEach(async (e) => {
                const qry = tx.orderItem.create({
                    data:{item:e.item,type:e.type,orderId:orderId}
                });
                qryArr.push(qry);
            });

            await Promise.all([...qryArr]).then((value) => {
                return {success:true}
            }).catch((err)=>{
                this.logger.error(err);
                return {success:false};
            });

            return {success:true};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 오더 바디 타입 생성
     * @param tx 
     * @param objOrderBodyType 
     * @param orderId 
     * @returns {success:boolean}
     */
    async insertOrderBodyType(tx, objOrderBodyType:ExOrderBodyTypeDto,orderId:number,isFirst:boolean){
        try{
            if(isFirst){
                await tx.orderBodyType.create({
                    data:{
                        tallWeight: objOrderBodyType.tallWeight ?? '',
                        digestion: objOrderBodyType.digestion ?? '',
                        sleep: objOrderBodyType.sleep ?? '',
                        constipation: objOrderBodyType.constipation ?? '',
                        nowDrug: objOrderBodyType.nowDrug ?? '',
                        pastDrug: objOrderBodyType.pastDrug ?? '',
                        pastSurgery: objOrderBodyType.pastSurgery ?? '',
                        orderId: orderId,
                    }
                });
    
            }

            return {success:true};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 교환,누락,환불 리스트 가져오기
     * @returns 
     */
    async getExchangeList(orderConditions, patientConditions){
        try{
            const list = await this.prisma.order.findMany({
                where:{
                    orderSortNum:{
                        gte:-4,
                        lt:-1
                    },
                    isComplete:false,
                    ...orderConditions,
                    ...patientConditions
                },
                select: {
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
            throw new HttpException({
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR,
                msg:'내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 환불 완료 처리
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async completeRefund(id:number){
        try{
            await this.prisma.order.update({
                where:{id:id},
                data:{isComplete:true}
            });

            return {success:true,status:HttpStatus.OK,msg:'완료'};
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