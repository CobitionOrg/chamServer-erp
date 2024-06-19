import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { GetListDto } from "src/erp/Dto/getList.dto";
import { PrismaService } from "src/prisma.service";
import { getKstDate } from "src/util/getKstDate";
import { getSortedList } from "src/util/sortSendList";
import { OrderInsertTalk } from "./Dto/orderInsert.dto";

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
            
            console.log(list);

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
    
    /**
     * 접수 알림톡 발송 완료 처리
     * @param list 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async completeInsertTalk(orderInsertDto: Array<OrderInsertTalk>){
        try{   
            const qryArr = [];

            for(const e of orderInsertDto) {
                const qry = this.prisma.order.update({
                    where:{id:e.id},
                    data:{talkFlag:true},
                });

                qryArr.push(qry);
            }

            await Promise.all([...qryArr]).then((value) => {
                //console.log(value);
                return { success: true, status: HttpStatus.OK };
            }).catch((err) => {
                this.logger.error(err);
                return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR };
            });
            
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

    /**
     * 상담 연결 처리
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async consultingFlag(id: number) {
        try{
            console.log(id);
            await this.prisma.order.update({
                where:{
                    id:id,talkFlag:true
                },
                data:{
                    consultingFlag: true
                }
            });

            return {success:true,status:HttpStatus.OK};
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


    /**
     * 상담 연결 안 된 사람들 엑셀 데이터
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
    async notConsulting(getListDto: GetListDto) {
        try{
            const {startDate, endDate} = getKstDate(getListDto.date);
            let orderConditions = {
                date: {
                    gte: startDate,
                    lt: endDate,
                }
            };

            const list = await this.prisma.order.findMany({
                where: {...orderConditions, orderSortNum:{gte:0},talkFlag:true,consultingFlag:false},
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


    /**
     * 미입금 된 인원 엑셀 데이터
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
    async notPay(getListDto: GetListDto) {
        try{
            const {startDate, endDate} = getKstDate(getListDto.date);
            let orderConditions = {
                date: {
                    gte: startDate,
                    lt: endDate,
                }
            };

            const data = await this.prisma.order.findMany({
                where:{...orderConditions,orderSortNum:{gte:0},talkFlag:true,consultingFlag:true},
                select: {
                    id:true,
                    patient:{select:{name:true,phoneNum:true},},
                    price:true,
                    cash:true,
                    card:true,
                }
            });

            //console.log(data);

            const list = data.filter(i => i.price != (i.cash + i.card) );
            console.log(list);

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


    /**
     * 발송 알림 톡 초진(수정 예정)
     * @param id 
     * @returns Promise<{
            success: boolean;
            list: any[];
        }>
     */
    async completeSendTalkFirst(id: number){
        try{
            const list = await this.prisma.tempOrder.findMany({
                where: {
                    sendListId: id,
                    isFirst: true
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum: 'asc' //sortNum으로 order by 해야됨
                },
                select: {
                    id: true,
                    isFirst: true,
                    orderSortNum: true,
                    sendNum: true,
                    patient: {
                        select: {
                            id: true,
                            phoneNum: true,
                            name: true,
                            //addr: true,
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            message: true,
                            cachReceipt: true,
                            price: true,
                            orderSortNum:true,
                            isFirst:true,
                            combineNum:true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos:{
                        select:{
                            info:true
                        }
                    },
                    tempOrderItems: {
                        select: {
                            item: true
                        }
                    }
                }
            });

            const sortedList = getSortedList(list);

            return { success: true, list: sortedList };
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


    /**
     * 발송 알림 톡 재진(수정 예정)
     * @param id 
     * @returns Promise<{
            success: boolean;
            list: any[];
        }>
     */
    async completeSendTalkReturn(id: number){
        try{
            const list = await this.prisma.tempOrder.findMany({
                where: {
                    sendListId: id,
                    isFirst: false
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum: 'asc' //sortNum으로 order by 해야됨
                },
                select: {
                    id: true,
                    isFirst: true,
                    orderSortNum: true,
                    sendNum: true,
                    patient: {
                        select: {
                            id: true,
                            phoneNum: true,
                            name: true,
                            //addr: true,
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            message: true,
                            cachReceipt: true,
                            price: true,
                            orderSortNum:true,
                            isFirst:true,
                            combineNum:true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos:{
                        select:{
                            info:true
                        }
                    },
                    tempOrderItems: {
                        select: {
                            item: true
                        }
                    }
                }
            });

            const sortedList = getSortedList(list);

            return { success: true, list: sortedList };
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