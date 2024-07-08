import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { GetListDto } from "src/erp/Dto/getList.dto";
import { PrismaService } from "src/prisma.service";
import { getKstDate } from "src/util/getKstDate";
import { getSortedList } from "src/util/sortSendList";
import { OrderInsertTalk } from "./Dto/orderInsert.dto";
import { Crypto } from 'src/util/crypto.util';
import { dateType } from "aws-sdk/clients/iam";
/*
인쇄번역
★ 접수확인알림톡 (초/재진 한번에)
-접수확인알림톡(리뉴얼)
- 9시/ 12시/3시

★ 미결제
- 미결제발송지연
- 금요일 오전 10시

★ 구매후기 (당주 월-금 초진만)
- 구매확정요청
- 토요일 9시

★ 유선상담연결안될시
- 유선상담 후 연결안되는경우
- 금요일 오전 10시

★ 발송알림톡
- 발송(재진)/ 발송(초진)
- 월, 화, 목, 금 오전 11시 */
@Injectable()
export class TalkRepositoy{
    constructor(
        private prisma: PrismaService,
        private crypto: Crypto,
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
            console.log(startDate,endDate);
            const list = await this.prisma.order.findMany({
                where: {...orderConditions, orderSortNum:{gte:0},talkFlag:false},
                select: {
                    id:true,
                    patient:{select:{name:true,phoneNum:true},}
                }
            });
            const res=list.map(item=>(
                {
                    id:item.id,
                    patient:
                    {
                        name:item.patient.name,
                        phoneNum:this.crypto.decrypt(item.patient.phoneNum)
                    }
                }))
            console.log(res);

            return {success:true, list:res, status:HttpStatus.OK};
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
            const res=list.map(item=>(
                {
                    id:item.id,
                    patient:
                    {
                        name:item.patient.name,
                        phoneNum:this.crypto.decrypt(item.patient.phoneNum)
                    }
                }))
            console.log(res);

            return {success:true, list:res, status:HttpStatus.OK};
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
            const res=list.map(item=>(
                {
                    id:item.id,
                    patient:
                    {
                        name:item.patient.name,
                        phoneNum:this.crypto.decrypt(item.patient.phoneNum)
                    }
                }))
            console.log(res);
            return {success:true, list:res, status:HttpStatus.OK};

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
     * 발송 알림 톡 id추출
     * @param date
     * @returns Promise<{
            id:number
        }>
     */
        async completeSendTalkGetList(date:string){
            try{
                const cid= await this.prisma.sendList.findFirst({
                    where: {
                       title:date,
                       useFlag:false
                    },
                    select: {
                        id: true,
                    }
                });
                return {success:true,cid};
            }
            catch(err)
            {
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

            const sortedList = list;

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

            const sortedList = list;

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