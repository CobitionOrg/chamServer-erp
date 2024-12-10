import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CancelOrderDto } from 'src/erp/Dto/cancelOrder.dto';
import { ErpService } from 'src/erp/erp.service';
import { PrismaService } from 'src/prisma.service';
import { getStartOfToday } from 'src/util/kstDate.util';
import { deleteUploadObject } from 'src/util/s3';
import { Crypto } from 'src/util/crypto.util';
import { CF_ORDERSORT_NUM } from 'src/config/orderSortNum';
import { PatientRepository } from 'src/patient/patient.repository';

const fs = require('fs');
const path = require('path');

@Injectable()
export class TasksRepository {
    constructor(
        private prisma: PrismaService,
        private patientRepository: PatientRepository,
        private crypto: Crypto,
    ) {}

    private readonly logger = new Logger(TasksRepository.name);

    /**
     * s3 데이터 삭제
     */
    async deleteS3Data() {
        try {
            const list = await this.prisma.urlData.findMany({});

            console.log(list);

            for (let i = 0; i < list.length; i++) {
                await deleteUploadObject(list[i].objectName);
            }

            await this.prisma.urlData.deleteMany({});

            this.logger.log('complete');
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    msg: '내부서버 에러',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 저장된 파일 삭제
     */
    async deleteSaveFile() {
        try {
            const folderPath = './src/files';
            // 폴더 안의 모든 파일 가져오기
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    console.error('폴더를 읽는 중 에러 발생:', err);
                    return;
                }

                // 각 파일을 순회하며 삭제
                files.forEach((file) => {
                    const filePath = path.join(folderPath, file);

                    // 파일 삭제
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error(
                                `파일을 삭제하는 중 에러 발생 (${file}):`,
                                err,
                            );
                        } else {
                            console.log(`파일 삭제 완료: ${file}`);
                        }
                    });
                });
            });
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    msg: '내부서버 에러',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 응답 처리 없는 상담자 소프트 삭제 처리
     * @returns
     */
    async deleteNotCallOrder() {
        try {
            const today = new Date();

            const twoMonthAgo = new Date(today.setMonth(today.getMonth() - 2));

            const oldRecords = await this.prisma.order.findMany({
                where: {
                    date: {
                        lt: twoMonthAgo,
                    },
                    talkFlag: true, //알람톡은 발송 됐으나
                    consultingFlag: false, //상담은 시작 안한 애들
                },
                select: {
                    id: true,
                    patient: { select: { id: true } },
                    isFirst: true,
                },
            });

            for (const e of oldRecords) {
                const cancelOrderDto: CancelOrderDto = {
                    orderId: e.id,
                    patientId: 0,
                    isFirst: false,
                };

                if (cancelOrderDto.isFirst) {
                    //초진 일 시 환자 데이터까지 soft delete
                    const orderId = cancelOrderDto.orderId;
                    const patientId = cancelOrderDto.patientId;

                    await this.prisma.$transaction(async (tx) => {
                        //orderBodyType soft delete
                        await tx.orderBodyType.update({
                            where: { orderId: orderId },
                            data: { useFlag: false },
                        });

                        //orderItem soft delete
                        await tx.orderItem.updateMany({
                            where: { orderId: orderId },
                            data: { useFlag: false },
                        });

                        //order soft delete
                        await tx.order.update({
                            where: { id: orderId },
                            data: { useFlag: false },
                        });

                        //patient soft delete
                        await tx.patient.update({
                            where: { id: patientId },
                            data: { useFlag: false },
                        });
                    });

                    return {
                        success: true,
                        status: HttpStatus.OK,
                        msg: '초진 삭제',
                    };
                } else {
                    //재진 일 시 환자 데이터는 가지고 있어야 되기 때문에 오더 정보만 삭제
                    const orderId = cancelOrderDto.orderId;

                    //오더만 useFlag false로 변경
                    await this.prisma.order.update({
                        where: { id: orderId },
                        data: { useFlag: false },
                    });

                    return {
                        success: true,
                        status: HttpStatus.OK,
                        msg: '재진 삭제',
                    };
                }
            }
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    msg: '내부서버 에러',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 퇴근 처리
     * @param time
     */
    async leaveWorkAt(time: number) {
        try {
            const date = getStartOfToday();
            const endTime = new Date(
                getStartOfToday().setUTCHours(time, 0, 0, 0),
            );

            await this.prisma.attendance.updateMany({
                where: { date: date },
                data: { endTime: endTime },
            });
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    msg: '내부서버 에러',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 접수 알림톡 데이터(수동과는 달리 알림톡 발송 안된 인원 전부 가져옴)
     * @returns
     */
    async orderInsertTalk() {
        try {
            const list = await this.prisma.order.findMany({
                where: {
                    orderSortNum: { gte: 0 },
                    talkFlag: false,
                    useFlag: true,
                },
                select: {
                    id: true,
                    patient: { select: { name: true, phoneNum: true } },
                },
            });

            const res = list.map((item) => ({
                id: item.id,
                patient: {
                    name: item.patient.name,
                    phoneNum: this.crypto.decrypt(item.patient.phoneNum),
                },
            }));

            return { success: true, list: res, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 발송 알람톡 보낸거 체크 처리
     * @param list
     * @returns {success:boolean,status:HttpStatus}
     */
    async updateTalkFlag(list) {
        try {
            await this.prisma.$transaction(async (tx) => {
                for (const e of list) {
                    await tx.order.update({
                        where: { id: e.id },
                        data: { talkFlag: true },
                    });
                }
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
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
        try {
            const res = await this.prisma.sendList.findMany({
                where: {
                    date: {
                        gte: startDate, //일요일부터
                        lte: endDate, // 금요일까지
                    },
                    tempOrders: {
                        some: {
                            order: {
                                isFirst: true, //초진만
                            },
                        },
                    },
                },
                select: {
                    tempOrders: {
                        select: {
                            order: {
                                select: {
                                    isFirst: true,
                                    patient: {
                                        select: {
                                            name: true,
                                            phoneNum: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            const filteredRes = res.map((sendList) => ({
                ...sendList,
                tempOrders: sendList.tempOrders.filter(
                    (tempOrder) => tempOrder.order.isFirst === true,
                ),
            }));

            const list = filteredRes[0].tempOrders;

            for (let row of list) {
                console.log(row);
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.order.patient.phoneNum,
                );
                row.order.patient.phoneNum = decryptedPhoneNum;
            }

            console.log(list);

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
    /**
     * 유선 상담 미연결 데이터
     * @returns
     */
    async notCall(yesterday: Date, twoWeeksAgo: Date) {
        try {
            const res = await this.prisma.order.findMany({
                where: {
                    date: {
                        gte: twoWeeksAgo,
                        lte: yesterday,
                    },
                    notCall: true,
                },
                select: {
                    patient: {
                        select: {
                            name: true,
                            phoneNum: true,
                        },
                    },
                },
            });

            for (let row of res) {
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                row.patient.phoneNum = decryptedPhoneNum;
            }

            return { success: true, list: res };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
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
                },
            });
            return { success: true, cid };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
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
                    isFirst: true,
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum: 'asc', //sortNum으로 order by 해야됨
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
                        },
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
                            orderItems: {
                                select: { item: true, type: true },
                            },
                        },
                    },
                    orderUpdateInfos: {
                        select: {
                            info: true,
                        },
                    },
                    tempOrderItems: {
                        select: {
                            item: true,
                        },
                    },
                },
            });

            const sortedList = list;

            return { success: true, list: sortedList };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
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
                    isFirst: false,
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum: 'asc', //sortNum으로 order by 해야됨
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
                        },
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
                            orderItems: {
                                select: { item: true, type: true },
                            },
                        },
                    },
                    orderUpdateInfos: {
                        select: {
                            info: true,
                        },
                    },
                    tempOrderItems: {
                        select: {
                            item: true,
                        },
                    },
                },
            });

            const sortedList = list;

            return { success: true, list: sortedList };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
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
                },
            };

            //초진 - 상담 연결되고 입금 안된 애들
            const firstList = await this.prisma.order.findMany({
                where: {
                    ...orderConditions,
                    orderSortNum: { gte: 0 },
                    talkFlag: true,
                    consultingFlag: true,
                    useFlag: true,
                    isFirst: true,
                    payFlag: 0,
                    consultingType: false,
                    phoneConsulting: true,
                    isComplete: false,
                },
                select: {
                    id: true,
                    patient: { select: { name: true, phoneNum: true } },
                    price: true,
                    cash: true,
                    card: true,
                },
            });

            //console.log(data);

            const list = firstList.filter((i) => i.price != i.cash + i.card);
            const resFisrt = list.map((item) => ({
                id: item.id,
                patient: {
                    name: item.patient.name,
                    phoneNum: this.crypto.decrypt(item.patient.phoneNum),
                },
            }));

            //재진 - 상담 연결 안되도 입금 안되면 다 보내기
            const returnList = await this.prisma.order.findMany({
                where: {
                    ...orderConditions,
                    orderSortNum: { gte: 0 },
                    // consultingFlag: false,
                    useFlag: true,
                    payFlag: 0,
                    isFirst: false,
                    consultingFlag: false,
                },
                select: {
                    id: true,
                    patient: { select: { name: true, phoneNum: true } },
                },
            });

            const resReturn = returnList.map((item) => ({
                id: item.id,
                patient: {
                    name: item.patient.name,
                    phoneNum: this.crypto.decrypt(item.patient.phoneNum),
                },
            }));

            let res = [...resFisrt, ...resReturn];
            console.log(res);
            return { success: true, list: res, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 1년 지난 추천 데이터 삭제
     * @param oneYearAgo :Date
     * @returns {success:boolean}
     */
    async deleteFriendRecommend(oneYearAgo: Date) {
        try {
            await this.prisma.friendRecommend.deleteMany({
                where: {
                    date: {
                        lt: oneYearAgo,
                    },
                },
            });

            return { success: true };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 2달 지난 주문데이터 삭제
     * @param twoMonthAgo //오늘 날짜로 부터 두 달 전
     * @returns
     */
    async getOldOrders(twoMonthAgo: Date) {
        try {
            const oldOrders = await this.prisma.order.findMany({
                where: {
                    date: {
                        lt: twoMonthAgo,
                    },
                    useFlag: true,
                    isComplete: false,
                    orderSortNum: { gte: CF_ORDERSORT_NUM.EXTRA },
                },
                select: {
                    id: true,
                    patientId: true,
                    isFirst: true,
                },
            });

            return { success: true, list: oldOrders };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
