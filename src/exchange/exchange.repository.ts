import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { ExOrderObjDto } from "./Dto/exOrderObj.dto";
import { ExOrderItemObjDto } from "./Dto/exOrderItemObj.dto";
import { ExOrderBodyTypeDto } from "./Dto/exOrderBodyType.dto";

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
                    typeCheck: true,
                    consultingTime: true,
                    payType: true,
                    essentialCheck: true,
                    outage: true,
                    patientId: true,
                    price: true,
                    remark: true,
                    orderItems: {
                        select:{
                            item:true,type:true
                        }
                    },
                    orderBodyType: {
                        select:{
                            tallWeight:true,digestion:true,sleep:true,constipation:true,nowDrug:true,pastDrug:true,pastSurgery:true
                        }
                    },
                }
            });

            console.log(exOrder);

            return exOrder;
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            };
        }
    }

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
                    date:new Date(),
                    orderSortNum: orderSortNum
                }
            });

            return {success:true,id:newOrder.id};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            };
        }
    }

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
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            };
        }
    }

    async insertOrderBodyType(tx, objOrderBodyType:ExOrderBodyTypeDto,orderId:number){
        try{
            await tx.orderBodyType.create({
                data:{
                    tallWeight: objOrderBodyType.tallWeight,
                    digestion: objOrderBodyType.digestion,
                    sleep: objOrderBodyType.sleep,
                    constipation: objOrderBodyType.constipation,
                    nowDrug: objOrderBodyType.nowDrug,
                    pastDrug: objOrderBodyType.pastDrug,
                    pastSurgery: objOrderBodyType.pastSurgery,
                    orderId: orderId,                }
            });

            return {success:true};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            };
        }
    }
}