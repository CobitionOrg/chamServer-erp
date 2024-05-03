import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { UpdateSurveyDto } from "./Dto/updateSurvey.dto";
import { error } from "winston";

//발송 목록 조회 기능
@Injectable()
export class SendService {
    constructor(
        private prisma : PrismaService
    ){}

    private readonly logger = new Logger(SendService.name);

      /**
     * 오더 테이블에서 발송 목록 가져오기
     * @returns 
     */
      async getSendList() {
        try {
            const list = await this.prisma.order.findMany({
                where: {
                    isComplete: true
                },
                orderBy: {
                    orderSortNum: 'asc'
                },
                select: {
                    id: true,
                    route: true,
                    message: true,
                    cachReceipt: true,
                    typeCheck: true,
                    consultingTime: true,
                    payType: true,
                    essentialCheck: true,
                    outage: true,
                    consultingType: true,
                    phoneConsulting: true,
                    isComplete: true,
                    isFirst: true,
                    date: true,
                    orderSortNum: true,
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
                    }
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 오더 테이블에서 발송목록 가져와서 tempOrder 테이블에 세팅하기
     * @returns 
     */
    async setSendList() {
        try {
            const sendList = await this.getSendList(); //isComplete 된 리스트 가져오기

            const arr = [];

            sendList.list.forEach((e) => {
                const obj = {
                    route: e.route,
                    message: e.message,
                    cachReceipt: e.cachReceipt,
                    typeCheck: e.typeCheck,
                    consultingTime: e.consultingTime,
                    payType: e.payType,
                    essentialCheck: e.essentialCheck,
                    outage: e.outage,
                    consultingType: e.consultingType,
                    phoneConsulting: e.phoneConsulting,
                    isComplete: e.isComplete,
                    isFirst: e.isFirst,
                    date: e.date,
                    orderSortNum: e.orderSortNum,
                    patientId: e.patient.id,
                    orderId: e.id
                }

                arr.push(obj);
            });

            //tempOrder에 세팅
            await this.prisma.tempOrder.createMany({
                data: arr
            });

            return { success: true }

        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록(tempOrder)에서 가져오기
     * @returns 
     */
    async getOrderTempList() {
        try {
            const list = await this.prisma.tempOrder.findMany({
                orderBy: {
                    //id: 'asc',
                    orderSortNum:'asc'
                },
                select: {
                    id: true,
                    outage: true,
                    date: true,
                    isFirst: true,
                    orderSortNum: true,
                    patient: {
                        select: {
                            id: true,
                            phoneNum: true,
                            name: true,
                            addr: true,
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            message: true,
                            cachReceipt: true,

                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    }
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * tempOrder 테이블에서 하나만 조회
     * @param id 
     * @returns 
     */
    async getOrderTempOne(id:number){
        try {
            const list = await this.prisma.tempOrder.findFirst({
                where: {
                    id: id
                },
                select: {
                    id: true,
                    outage: true,
                    date: true,
                    isFirst: true,
                    orderSortNum: true,
                    patient: {
                        select: {
                            id: true,
                            phoneNum: true,
                            name: true,
                            addr: true,
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            message: true,
                            cachReceipt: true,

                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    }
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    async updateSendOrder(surveyDto:UpdateSurveyDto){
        try{
            const insertOrder = surveyDto.answers;
            const patientId = surveyDto.patientId;
            const orderId = surveyDto.orderId;

            const objPatient:any = {};
            const objOrder:any = {};
            const objOrderItem:any = [];

            //console.log(insertOrder);

            insertOrder.forEach(e => {
                //console.log(e)
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    const obj = {
                        item: e.answer,
                        type: e.code
                    }
                    objOrderItem.push(obj);
                } else {
                    throw error('400 error');
                }
            });

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.update({
                    where:{
                        id:patientId
                    },
                    data:{
                        addr:objPatient.addr
                    }
                });

                const order = await tx.order.update({
                    where:{
                        id:orderId
                    },
                    data:{
                        cachReceipt:objOrder.cashReceipt
                    }
                });

                console.log('----------------')
                console.log(objOrderItem)
                const items = [];
                objOrderItem.forEach((e) => {
                    if(e.type =='assistant'){
                        const obj = {
                            item:e.item,
                            type:e.type,
                            orderId:orderId
                        }
                        items.push(obj);
                    }else{
                        const arr = [...e.item];
                        arr.forEach((i) => {
                            const obj = {
                                item: i,
                                type: e.type,
                                orderId: orderId
                            }
    
                            items.push(obj);
                        });
                    }
                   
                });

                await tx.orderItem.deleteMany({
                    where:{
                        orderId:orderId
                    }
                });

                const orderItem = await tx.orderItem.createMany({
                    data:items
                });
            });

            return { success: true, status: HttpStatus.CREATED };

        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }

        }
    }

}