import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { GetListDto } from "src/erp/Dto/getList.dto";
import { PrismaService } from "src/prisma.service";
import { getSortedList } from "src/util/sortSendList";
import { OrderInsertTalk } from "./Dto/orderInsert.dto";
import { Crypto } from 'src/util/crypto.util';
import { dateType } from "aws-sdk/clients/iam";
import { getDayStartAndEnd } from "src/util/kstDate.util";

@Injectable()
export class TalkRepositoy {
    constructor(
        private prisma: PrismaService,
        private crypto: Crypto,
    ) { }

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
        try {
            let orderConditions = {}

            if (getListDto.date === undefined) {
                //날짜 조건이 없을 시에
                //접수 알람톡이 전송 안된 사람들 리스트 전부
                orderConditions = {orderSortNum: { gte: 0 }, talkFlag: false, useFlag: true}
            }else {
                // 지정 된 날짜의 접수 알람톡 전송 안된 사람들 리스트
                const { startDate, endDate } = getDayStartAndEnd(getListDto.date);
                orderConditions = {
                    orderSortNum: { gte: 0 }, talkFlag: false, useFlag: true,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    }
                }
            }
           
            const list = await this.prisma.order.findMany({
                where: { ...orderConditions },
                select: {
                    id: true,
                    patient: { select: { name: true, phoneNum: true }, }
                }
            });

            const res = list.map(item => ({
                    id: item.id,
                    patient:
                    {
                        name: item.patient.name,
                        phoneNum: this.crypto.decrypt(item.patient.phoneNum)
                    }
                }))


            return { success: true, list: res, status: HttpStatus.OK };
        } catch (err) {
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
    async completeInsertTalk(orderInsertDto: Array<OrderInsertTalk>) {
        try {
            const qryArr = [];

            for (const e of orderInsertDto) {
                const qry = this.prisma.order.update({
                    where: { id: e.id },
                    data: { talkFlag: true },
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

            return { success: true, status: HttpStatus.OK }
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }


    async getExOrder(id: number) {
        try {
            const res = await this.prisma.order.findUnique({
                where: {
                    id: id
                },
                select: {
                    message: true,
                    date: true,
                    route: true,
                }
            });

            return res;
        } catch (err) {
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
        try {
            console.log(id);
            await this.prisma.order.updateMany({
                where: {
                    id: id, 
                    //talkFlag: true //이거 지워도 되지 않을까 해서 주석으로 남겨놓습니다
                },
                data: {
                    consultingFlag: true,
                    talkFlag: true, //상담연결 되서 굳이 알람톡 안보내도 된다고 함
                }
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
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
     * 구매 후기 요청용 데이터
     * @param startDate 
     * @param endDate 
     * @returns 
     */
    async payReview(startDate: Date, endDate: Date) {
        try{
            const res = await this.prisma.sendList.findMany({
                where:{
                    date:{ 
                        gte:startDate, //일요일부터
                        lte:endDate // 금요일까지
                    },
                    tempOrders : {
                        some: {
                            order: {
                                isFirst: true //초진만
                            }
                        }
                    }
                },
                select:{
                    tempOrders:{
                        select:{
                            order:{
                                select:{
                                    isFirst: true,
                                    patient:{
                                        select:{
                                            name:true,
                                            phoneNum: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const filteredRes = res.map(sendList => ({
                ...sendList,
                tempOrders: sendList.tempOrders.filter(tempOrder => tempOrder.order.isFirst === true)
              }));

            const list = filteredRes[0].tempOrders

            for(let row of list) {
                console.log(row);
                const decryptedPhoneNum = this.crypto.decrypt(row.order.patient.phoneNum);
                row.order.patient.phoneNum = decryptedPhoneNum;
            }

            console.log(list);

           
            return {success: true, list};

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
     * 유선 상담 미연결 데이터
     * @returns 
     */
    async notCall(yesterday: Date, twoWeeksAgo: Date) {
        try{
            const res = await this.prisma.order.findMany({
                where:{
                    date:{
                        gte: twoWeeksAgo,
                        lte: yesterday
                    },
                    notCall:true
                },
                select:{
                    patient:{
                        select:{
                            name: true,
                            phoneNum: true,
                        }
                    }
                }
            });

            for(let row of res) {
                const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
                row.patient.phoneNum = decryptedPhoneNum;
            }

            return {success: true, list:res};
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
        async notPay(yesterday: Date, fourWeeksAgo: Date) {
            try {
                let orderConditions = {
                    date: {
                        gte: fourWeeksAgo,
                        lte: yesterday,
                    }
                };
    
                //초진 - 상담 연결되고 입금 안된 애들
                const firstList = await this.prisma.order.findMany({
                    where: { 
                        ...orderConditions, 
                        orderSortNum: { gte: 0 }, 
                        talkFlag: true, 
                        consultingFlag: true, 
                        useFlag: true,
                        isFirst:true,
                        payFlag:0, 
                        consultingType:false,
                        phoneConsulting:true,
                        isComplete:false,
    
                     },
                    select: {
                        id: true,
                        patient: { select: { name: true, phoneNum: true }, },
                        price: true,
                        cash: true,
                        card: true,
                    }
                });
    
                //console.log(data);
    
                const list = firstList.filter(i => i.price != (i.cash + i.card));
                const resFisrt = list.map(item => ({
                    id: item.id,
                    patient:
                    {
                        name: item.patient.name,
                        phoneNum: this.crypto.decrypt(item.patient.phoneNum)
                    }
                }))

                //재진 - 상담 연결 안되도 입금 안되면 다 보내기
                const returnList = await this.prisma.order.findMany({
                    where: { 
                        ...orderConditions, 
                        orderSortNum: { gte: 0 }, 
                        consultingFlag: false, 
                        useFlag: true, 
                        payFlag:0, 
                        isFirst:false,
                        
                    },
                    select: {
                        id: true,
                        patient: { select: { name: true, phoneNum: true }, }
                    }
                });
    
                const resReturn = returnList.map(item => ({
                    id: item.id,
                    patient:
                    {
                        name: item.patient.name,
                        phoneNum: this.crypto.decrypt(item.patient.phoneNum)
                    }
                }));
    
                let res = [...resFisrt, ...resReturn];
                console.log(res);
                return { success: true, list: res, status: HttpStatus.OK };
    
            } catch (err) {
                this.logger.error(err);
                throw new HttpException({
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                },
                    HttpStatus.INTERNAL_SERVER_ERROR
                );
            }
        }
    ///////////////////////////////////////////////////////////////


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
    async notConsulting(yesterday: Date, fourWeeksAgo: Date) {
        try {
            let orderConditions = {
                date: {
                    gte: fourWeeksAgo,
                    lte: yesterday,
                }
            };

            //초진 - 상담 연결되고 입금 안된 애들
            const firstList = await this.prisma.order.findMany({
                where: { 
                    ...orderConditions, 
                    orderSortNum: { gte: 0 }, 
                    talkFlag: true, 
                    consultingFlag: false, 
                    useFlag: true, 
                    payFlag:0, 
                    isFirst:true
                },
                select: {
                    id: true,
                    patient: { select: { name: true, phoneNum: true }, }
                }
            });

            const resFisrt = firstList.map(item => ({
                id: item.id,
                patient:
                {
                    name: item.patient.name,
                    phoneNum: this.crypto.decrypt(item.patient.phoneNum)
                }
            }));

            //재진 - 상담 연결 안되도 입금 안되면 다 보내기
            const returnList = await this.prisma.order.findMany({
                where: { 
                    ...orderConditions, 
                    orderSortNum: { gte: 0 }, 
                    consultingFlag: false, 
                    useFlag: true, 
                    payFlag:0, 
                    isFirst:false
                },
                select: {
                    id: true,
                    patient: { select: { name: true, phoneNum: true }, }
                }
            });

            const resReturn = returnList.map(item => ({
                id: item.id,
                patient:
                {
                    name: item.patient.name,
                    phoneNum: this.crypto.decrypt(item.patient.phoneNum)
                }
            }));

            let res = [...resFisrt, ...resReturn];
            console.log(res);
            return { success: true, list: res, status: HttpStatus.OK };


        } catch (err) {
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
    async completeSendTalkGetList(date: string) {
        try {
            const cid = await this.prisma.sendList.findFirst({
                where: {
                    title: date,
                },
                select: {
                    id: true,
                }
            });
            return { success: true, cid };
        }
        catch (err) {
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
    async completeSendTalkFirst(id: number) {
        try {
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
                            orderSortNum: true,
                            isFirst: true,
                            combineNum: true,
                            remark:true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos: {
                        select: {
                            info: true
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
        } catch (err) {
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
    async completeSendTalkReturn(id: number) {
        try {
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
                            orderSortNum: true,
                            isFirst: true,
                            combineNum: true,
                            remark: true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos: {
                        select: {
                            info: true
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
        } catch (err) {
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