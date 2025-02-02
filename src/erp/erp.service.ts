import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Excel from 'exceljs';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { error } from 'console';
import { OrderObjDto } from './Dto/orderObj.dto';
import { CallConsultingDto } from './Dto/callConsulting.dto';
import { AdminService } from 'src/admin/admin.service';
import { SurveyDto } from './Dto/survey.dto';
import { PatientDto } from './Dto/patient.dto';
import { generateUploadURL } from '../util/s3';
import { createExcelCash, styleHeaderCell } from 'src/util/excelUtil';
import { checkGSB } from '../util/checkGSB.util';
import { GetListDto } from './Dto/getList.dto';
import { InsertCashDto } from './Dto/insertCash.dto';
import { CashExcel } from 'src/util/cashExcel';
import { getSendTitle } from 'src/util/getSendTitle';
import { GetOrderSendPrice, checkSend } from 'src/util/getOrderPrice';
import { CompleteSetSendDto } from './Dto/completeSetSend.dto';
import { GetHyphen } from 'src/util/hyphen';
import { CombineOrderDto } from './Dto/combineOrder.dto';
import { SepareteDto } from './Dto/separteData.dto';
import { sortItems } from 'src/util/sortItems';
import { CancelOrderDto } from './Dto/cancelOrder.dto';
import { Crypto } from 'src/util/crypto.util';
import { NewOrderDto } from './Dto/newOrder.dto';
import { CheckDiscountDto } from './Dto/checkDiscount.dto';
import { UpdateNoteDto } from './Dto/updateNote.dto';
import { CreateNewReviewDto } from './Dto/createNewReview.dto';
import {
    getCurrentDateAndTime,
    getCurrentMonth,
    getDayOfWeek,
    getDayStartAndEnd,
    getFirstAndLastDayOfMonth,
    getFirstAndLastDayOfOnlyMonth,
    getFirstAndLastDayOfYearAndMonth,
    getStartOfToday,
} from 'src/util/kstDate.util';
import { getMonth } from 'src/util/getMonth';
import { getSortedList } from 'src/util/sortSendList';
import { getOutage } from 'src/util/getOutage';
import { SendCombineDto } from './Dto/sendCombineDto';
import { GetDateDto } from './Dto/getDate.dto';
import { RouteFlagDto } from './Dto/routeFlag.dto';
import { getItemOnlyLen } from 'src/util/accountBook';
import { CancelFriendDto } from './Dto/cancelFriend.dto';
const Prisma = require('@prisma/client').Prisma;

@Injectable()
export class ErpService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private adminService: AdminService,
        private crypto: Crypto,
    ) {}

    private readonly logger = new Logger(ErpService.name);

    /**
     * 초진 오더 접수
     * @param insertOrder
     * @returns {success:boolean,status:number}
     */
    async insertFirstOrder(surveyDto: SurveyDto) {
        try {
            const insertOrder = surveyDto.answers;
            const date = new Date(surveyDto.date);
            // 한국 시간으로 변환
            const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

            //타입 설정 예정
            const objPatient: any = {}; //환자 정보
            const objOrder: OrderObjDto = {
                route: '',
                message: '',
                cachReceipt: '',
                typeCheck: '',
                consultingTime: '',
                payType: '',
            }; //오더 정보
            const objOrderBodyType: any = {}; //초진 시 건강 응답 정보
            const objOrderItem: any = []; //오더 아이템 정보

            insertOrder.forEach((e) => {
                //console.log(e)
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    if (e.answer != '') {
                        const obj = {
                            item: e.answer,
                            type: e.code,
                        };
                        objOrderItem.push(obj);
                    }
                } else if (e.orderType == 'orderBodyType') {
                    objOrderBodyType[`${e.code}`] = e.answer;
                } else {
                    throw new HttpException(
                        {
                            success: false,
                            status: HttpStatus.BAD_REQUEST,
                        },
                        HttpStatus.BAD_REQUEST,
                    );
                }
            });

            //기존 환자가 있는지 체크
            const existPatient = await this.existPatientCheck(
                objPatient.name,
                objPatient.socialNum,
            );
            console.log(existPatient + ' 기존환자 체크');
            if (!existPatient.success) {
                //있으면 재진으로 접수 처리
                return {
                    success: false,
                    status: HttpStatus.CONFLICT,
                    msg: '이미 접수하신 이력이 있습니다. 재진접수를 이용해주세요',
                };
            }

            // //처리되는 주문이 있는지 확인
            // const existOrder = await this.existOrderCheck(objPatient.name,objPatient.socialNum);

            // if(!existOrder){
            //     return {success:false, status:HttpStatus.CONFLICT, msg:'이미 접수된 주문이 있습니다. 수정을 원하시면 주문 수정을 해주세요'};
            // }

            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(
                objOrderItem,
                itemList,
                false,
                objPatient.addr,
            );
            const price = getOrderPrice.getPrice();
            console.log(price);
            console.log('=====================');

            console.log(objOrder);
            console.log(objPatient);
            console.log(objOrderBodyType);
            console.log(objOrderItem);

            const encryptedPhoneNum = this.crypto.encrypt(objPatient.phoneNum);
            const encryptedAddr = this.crypto.encrypt(objPatient.addr);
            const encryptedSocialNum = this.crypto.encrypt(
                objPatient.socialNum,
            );

            await this.prisma.$transaction(
                async (tx) => {
                    let remark = '';
                    let orderSortNum = 1;

                    const patient = await tx.patient.create({
                        data: {
                            name: objPatient.name,
                            phoneNum: encryptedPhoneNum,
                            addr: encryptedAddr,
                            socialNum: encryptedSocialNum,
                            orderDate: kstDate,
                        },
                    });

                    if (
                        objOrder.route.includes('파주맘') ||
                        objOrder.route.includes('파주')
                    ) {
                        remark = '파주맘';
                        orderSortNum = 2;
                    }

                    if (objPatient.addr && objPatient.addr.includes('제주')) {
                        remark = remark == '' ? '제주' : (remark += '/제주');
                    }

                    if (objPatient.addr && objPatient.addr.includes('울릉')) {
                        remark = remark == '' ? '울릉' : (remark += '/울릉');
                    }

                    if (checkGSB(objOrder.route)) {
                        remark =
                            remark == '' ? '구수방' : (remark += '/구수방');
                        orderSortNum = 5;
                    }

                    console.log(orderSortNum);
                    const order = await tx.order.create({
                        data: {
                            route: objOrder.route,
                            message: objOrder.message,
                            cachReceipt: objOrder.cachReceipt,
                            typeCheck: objOrder.typeCheck,
                            consultingTime: objOrder.consultingTime,
                            payType: objOrder.payType,
                            essentialCheck: '',
                            outage: '',
                            isFirst: true,
                            price: price,
                            patientId: patient.id,
                            date: kstDate,
                            orderSortNum: orderSortNum, //구수방인지 체크
                            addr: encryptedAddr,
                            remark: remark,
                        },
                    });

                    const orderBodyType = await tx.orderBodyType.create({
                        data: {
                            tallWeight: objOrderBodyType.tallWeight,
                            digestion: objOrderBodyType.digestion.join('/'),
                            sleep: objOrderBodyType.sleep.join('/'),
                            constipation:
                                objOrderBodyType.constipation.join('/'),
                            nowDrug: objOrderBodyType.nowDrug.join('/'),
                            pastDrug: objOrderBodyType.pastDrug.join('/'),
                            pastSurgery: objOrderBodyType.pastSurgery.join('/'),
                            orderId: order.id,
                        },
                    });

                    const patientBodyType = await tx.patientBodyType.create({
                        data: {
                            tallWeight: objOrderBodyType.tallWeight,
                            digestion: objOrderBodyType.digestion.join('/'),
                            sleep: objOrderBodyType.sleep.join('/'),
                            constipation:
                                objOrderBodyType.constipation.join('/'),
                            nowDrug: objOrderBodyType.nowDrug.join('/'),
                            pastDrug: objOrderBodyType.pastDrug.join('/'),
                            pastSurgery: objOrderBodyType.pastSurgery.join('/'),
                            patientId: patient.id,
                        },
                    });

                    console.log(objOrderItem);
                    console.log('--------------------');

                    const items = [];
                    let assistantFlag = false; //별도 주문만 있는지 체크 플래그
                    let commonFlag = false; // 별도 주문 외에 주문 있는지 체크 플래그

                    for (const e of objOrderItem) {
                        const item = {
                            item: e.item,
                            type: e.type,
                            orderId: order.id,
                        };

                        if (e.type == 'assistant') {
                            //별도 주문이 있을 때
                            assistantFlag = true;
                        } else {
                            if (
                                e.item !==
                                '개월수선택안함(상담후선택원하는 분/ 별도구매원하는 분) '
                            ) {
                                console.log('별도 주문 외에 주문이 있음');
                                commonFlag = true;
                            }
                        }

                        if (
                            e.item !==
                            '개월수선택안함(상담후선택원하는 분/ 별도구매원하는 분) '
                        ) {
                            items.push(item);
                        }
                    }

                    console.log(assistantFlag);
                    console.log(commonFlag);

                    //별도 주문만 있을 때 - orderSortNum - 0
                    if (assistantFlag && !commonFlag) {
                        orderSortNum = 0;
                    }

                    //별도 주문도 추가 일 때 orderSortNum - 2
                    if (assistantFlag && commonFlag) {
                        console.log(orderSortNum + '!!');
                        orderSortNum = 2;
                    }

                    console.log(items);

                    const orderItem = await tx.orderItem.createMany({
                        data: items,
                    });

                    //지인 체크
                    const route = objOrder.route
                        .replace(/\s+/g, '')
                        .replace(/\//g, '');
                    console.log(route);

                    if (route !== '' && orderSortNum != 0) {
                        const routeName =
                            route.match(/[^\d]+/g) !== null
                                ? route.match(/[^\d]+/g).join('')
                                : null; //지인 이름
                        const routePhoneNum =
                            route.match(/\d+/g) !== null
                                ? route.match(/\d+/g).join('')
                                : null; //지인 번호

                        let checkRecommend;

                        if (routeName !== null && routePhoneNum !== null) {
                            checkRecommend = await this.checkRecommend(
                                routeName,
                                routePhoneNum,
                            );

                            if (checkRecommend.success) {
                                //지인 확인 되었을 시
                                orderSortNum =
                                    orderSortNum == 1 ? 4 : orderSortNum; // 일반일 경우만 지인 처리 (나머지는 그 orderSortNum으로)

                                remark =
                                    remark == ''
                                        ? '지인 10포'
                                        : (remark += '/지인 10포');

                                await tx.friendRecommend.create({
                                    data: {
                                        orderId: order.id,
                                        patientId: checkRecommend.patientId,
                                        checkFlag: true,
                                        date: kstDate,
                                        name: routeName,
                                        phoneNum: routePhoneNum,
                                    },
                                });

                                await tx.order.update({
                                    where: { id: order.id },
                                    data: {
                                        orderSortNum: orderSortNum,
                                        remark: remark,
                                    },
                                });
                            } else {
                                //지인을 입력했을 때 지인 확인이 안될 때
                                await tx.order.update({
                                    where: { id: order.id },
                                    data: { routeFlag: true },
                                });
                            }
                        }
                        // 이벤트용 코드
                        else if (
                            routePhoneNum === null &&
                            route.includes('참새')
                        ) {
                            console.log('////////////////////////////////////');

                            orderSortNum = orderSortNum = 8;
                            remark =
                                remark == ''
                                    ? '이벤트 10포'
                                    : (remark += '/이벤트 10포');

                            await tx.order.update({
                                where: { id: order.id },
                                data: {
                                    orderSortNum: orderSortNum,
                                    remark: remark,
                                },
                            });
                        } else {
                        }
                    } else {
                        //그 외의 경우 마지막으로 orderSortNum 업데이트
                        await tx.order.update({
                            where: { id: order.id },
                            data: { orderSortNum: orderSortNum },
                        });
                    }
                },
                { timeout: 10000 },
            );

            return { success: true, status: HttpStatus.CREATED };
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
     * 초진용 기존 환자 있는지 확인 여부
     * @param name
     * @param socialNum
     * @returns {success:boolean}
     */
    async existPatientCheck(name: string, socialNum: string) {
        try {
            console.log(name);
            console.log(socialNum);
            const res = await this.prisma.patient.findMany({
                where: { name, useFlag: true }, //설마 이름도 같고 생년월일에 성도 같은 사람이 존재 하겠어?
            });
            console.log(res);

            let check = true;

            for (const e of res) {
                const checkSocialNum = this.crypto.decrypt(e.socialNum);
                if (checkSocialNum === socialNum) {
                    check = false;
                    break;
                }
            }

            console.log('check', check);
            return { success: check };
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
     * 지인 할인 적용 여부
     * @param id
     * @returns {success:boolean, status:HttpStatus}
     */
    async friendDiscount(id: number) {
        try {
            const itemList = await this.getItems();

            await this.prisma.$transaction(async (tx) => {
                const exOrder = await tx.order.findUnique({
                    where: { id: id },
                    select: {
                        friendDiscount: true,
                        price: true,
                        orderItems: true,
                        addr: true,
                        patientId: true,
                    },
                });

                let price = 0;

                const encryptedAddr = this.crypto.decrypt(exOrder.addr);

                const getOrderPrice = new GetOrderSendPrice(
                    exOrder.orderItems,
                    itemList,
                    false,
                    encryptedAddr,
                );

                if (exOrder.friendDiscount) {
                    //할인 한다고 했다가 취소하는 경우
                    price = getOrderPrice.getPrice();

                    const usedAlreadyRecommend =
                        await tx.friendRecommend.findMany({
                            where: {
                                patientId: exOrder.patientId,
                                useFlag: false,
                                is_del: false,
                            },
                        });

                    for (let i = 0; i < 3; i++) {
                        //3개가 안되는 경우가 있으므로
                        if (!usedAlreadyRecommend[i]) break;

                        await tx.friendRecommend.update({
                            where: { id: usedAlreadyRecommend[i].id },
                            data: { useFlag: true },
                        });
                    }
                } else {
                    //할인 적용하는 경우
                    price = getOrderPrice.getTenDiscount();
                }

                await tx.order.update({
                    where: { id: id },
                    data: {
                        friendDiscount: !exOrder.friendDiscount,
                        price: price,
                    },
                });
            });

            return { success: true, status: HttpStatus.CREATED };
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
     * 오더리스트 조회
     * @returns {
        patient: {
            id: number;
            name: string;
            phoneNum: string;
            addr: string;
        };
        id: number;
        route: string;
        message: string;
        cachReceipt: string;
        typeCheck: string;
        consultingTime: string;
        payType: string;
        outage: string;
        consultingType:boolean,
        phoneConsulting:boolean,
        isFirst:boolean,
        date:Date,
        orderItems: {
            item:string,
            type:string,
        }[];
     */
    async getReciptList(getListDto: GetListDto) {
        try {
            console.log(getListDto);
            let orderConditions = {};
            let firstCount = 0;
            let returnCount = 0;
            if (
                getListDto.date === undefined &&
                getListDto.month === undefined &&
                getListDto.year === undefined
            ) {
                //날짜 조건 X
                orderConditions = {
                    consultingType: false,
                    isComplete: false,
                    useFlag: true,
                };
            } else {
                //날짜 조건 O
                const { startDate, endDate } =
                    getListDto.month === undefined
                        ? getDayStartAndEnd(getListDto.date)
                        : getListDto.year !== undefined
                          ? getFirstAndLastDayOfYearAndMonth(
                                getListDto.year,
                                getListDto.month,
                            )
                          : getFirstAndLastDayOfOnlyMonth(getListDto.month);

                console.log(startDate, endDate);
                firstCount = await this.getOrderCount(startDate, endDate, true);
                returnCount = await this.getOrderCount(
                    startDate,
                    endDate,
                    false,
                );

                orderConditions = {
                    consultingType: false,
                    isComplete: false,
                    useFlag: true,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                };
            }

            // console.log(getListDto.isFirst);

            if (getListDto.isFirst == 'first') {
                orderConditions = {
                    ...orderConditions,
                    isFirst: true,
                };
            } else if (getListDto.isFirst == 'return') {
                orderConditions = {
                    ...orderConditions,
                    isFirst: false,
                };
            }

            let patientConditions = {};
            // if (getListDto.searchKeyword !== "") {
            //     //검색어 O
            //     patientConditions = {
            //         patient: {
            //             name: { contains: getListDto.searchKeyword }
            //         }
            //     };
            // }
            const list = await this.prisma.order.findMany({
                where: {
                    ...orderConditions,
                    ...patientConditions,
                    orderSortNum: { gte: 0 },
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
                    consultingFlag: true,
                    consultingType: true,
                    phoneConsulting: true,
                    isFirst: true,
                    date: true,
                    orderSortNum: true,
                    remark: true,
                    isPickup: true,
                    price: true,
                    card: true,
                    cash: true,
                    addr: true,
                    routeFlag: true,
                    friendDiscount: true,
                    notCall: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        },
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        },
                    },
                    friendRecommends: {
                        select: {
                            id: true,
                            checkFlag: true,
                            name: true,
                            phoneNum: true,
                        },
                    },
                },
            });

            //console.log(list);

            const sortedList = sortItems(list);
            let resList = [];

            for (let row of sortedList) {
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPatientAddr = this.crypto.decrypt(
                    row.patient.addr,
                );
                row.patient.phoneNum = decryptedPhoneNum;
                row.addr = decryptedAddr;
                row.patient.addr = decryptedPatientAddr;

                if (getListDto.searchKeyword !== '') {
                    if (
                        row.patient.name.includes(getListDto.searchKeyword) ||
                        row.patient.phoneNum.includes(getListDto.searchKeyword)
                    ) {
                        resList.push(row);
                    }
                } else {
                    resList.push(row);
                }
            }

            return { success: true, list: resList, firstCount, returnCount };
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
     * 해당 날짜 전체 오더 데이터 가져오기
     * @param getListDto
     * @returns
     */
    async getAllOrderAtDay(getListDto: GetListDto) {
        try {
            let orderConditions = {};
            let firstCount = 0;
            let returnCount = 0;
            if (getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    // consultingType: false,
                    // isComplete: false,
                    //useFlag: true,
                };
            } else {
                //날짜 조건 O
                const { startDate, endDate } =
                    getListDto.month === undefined
                        ? getDayStartAndEnd(getListDto.date)
                        : getListDto.year !== undefined
                          ? getFirstAndLastDayOfYearAndMonth(
                                getListDto.year,
                                getListDto.month,
                            )
                          : getFirstAndLastDayOfOnlyMonth(getListDto.month);

                firstCount = await this.getOrderCount(
                    startDate,
                    endDate,
                    true,
                    true,
                );
                returnCount = await this.getOrderCount(
                    startDate,
                    endDate,
                    false,
                    true,
                );

                orderConditions = {
                    // consultingType: false,
                    // isComplete: false,
                    //useFlag: true,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                };
            }

            const list = await this.prisma.order.findMany({
                where: { ...orderConditions, orderSortNum: { gte: 0 } },
                select: {
                    id: true,
                    route: true,
                    message: true,
                    cachReceipt: true,
                    typeCheck: true,
                    consultingTime: true,
                    payType: true,
                    outage: true,
                    consultingFlag: true,
                    consultingType: true,
                    phoneConsulting: true,
                    isFirst: true,
                    date: true,
                    orderSortNum: true,
                    remark: true,
                    isPickup: true,
                    price: true,
                    card: true,
                    cash: true,
                    addr: true,
                    routeFlag: true,
                    friendDiscount: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        },
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        },
                    },
                    friendRecommends: {
                        select: {
                            checkFlag: true,
                            name: true,
                            phoneNum: true,
                        },
                    },
                },
            });

            //console.log(list);

            const sortedList = sortItems(list);
            let resList = [];

            for (let row of sortedList) {
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPatientAddr = this.crypto.decrypt(
                    row.patient.addr,
                );
                row.patient.phoneNum = decryptedPhoneNum;
                row.addr = decryptedAddr;
                row.patient.addr = decryptedPatientAddr;

                if (getListDto.searchKeyword !== '') {
                    if (
                        row.patient.name.includes(getListDto.searchKeyword) ||
                        row.patient.phoneNum.includes(getListDto.searchKeyword)
                    ) {
                        resList.push(row);
                    }
                } else {
                    resList.push(row);
                }
            }

            return { success: true, list: resList, firstCount, returnCount };
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
     * 그 날 초재진 개수 가져오기
     * @param startDate
     * @param endDate
     * @param isFirst
     * @param useFlag
     * @returns
     */
    async getOrderCount(startDate, endDate, isFirst, useFlag?) {
        try {
            let condition = {};
            if (useFlag == undefined) {
                condition = { useFlag: true };
            }

            console.log(condition);
            const res = await this.prisma.order.findMany({
                where: {
                    ...condition,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                    isFirst: isFirst,
                    orderSortNum: { gte: 0 },
                },
                select: {
                    id: true,
                },
            });

            return res.length;
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
     * 재진 오더 접수
     * @param surveyDto
     * @returns {success:boolean,status:number}
     */
    async insertReturnOrder(surveyDto: SurveyDto) {
        try {
            console.log('재진 접수');
            console.log(surveyDto);
            const insertOrder = surveyDto.answers;
            const date = new Date(surveyDto.date);
            // 한국 시간으로 변환
            const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

            console.log(insertOrder);
            // console.log(date);

            const objPatient: PatientDto = {
                name: '',
                socialNum: '',
                addr: '',
                phoneNum: '',
            };
            const objOrder: any = {};
            const objOrderBodyType: any = {};
            const objOrderItem: any = [];

            insertOrder.forEach((e) => {
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    console.log(e);
                    const obj = {
                        item: e.answer,
                        type: e.code,
                    };
                    objOrderItem.push(obj);
                } else if (e.orderType == 'orderBodyType') {
                    objOrderBodyType[`${e.code}`] = e.answer;
                } else {
                    throw new HttpException(
                        {
                            success: false,
                            status: HttpStatus.BAD_REQUEST,
                        },
                        HttpStatus.BAD_REQUEST,
                    );
                }
            });

            const patient = await this.checkPatient(objPatient);

            console.log('this is patientttttttttttttttttttttttt');
            console.log(patient);
            if (!patient.success)
                return {
                    success: false,
                    status: HttpStatus.NOT_FOUND,
                    msg: '환자 정보가 없습니다. 입력 내역을 확인하거나 처음 접수시라면 초진 접수로 이동해주세요',
                };

            //처리되는 주문이 있는지 확인
            const existOrder = await this.existOrderCheck(
                objPatient.name,
                objPatient.socialNum,
            );

            if (!existOrder) {
                return {
                    success: false,
                    status: HttpStatus.CONFLICT,
                    msg: '이미 접수된 주문이 있습니다. 수정을 원하시면 주문 수정을 해주세요',
                };
            }
            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(
                objOrderItem,
                itemList,
                false,
                objPatient.addr,
            );

            let price = getOrderPrice.getPrice();
            console.log(price);
            console.log('=====================');

            const encryptedAddr = this.crypto.encrypt(objPatient.addr);
            const encryptedPhoneNum = this.crypto.encrypt(objPatient.phoneNum);

            await this.prisma.$transaction(
                async (tx) => {
                    await tx.patient.update({
                        where: {
                            id: patient.patient.id,
                        },
                        data: {
                            addr: encryptedAddr,
                            phoneNum: encryptedPhoneNum,
                            orderDate: kstDate,
                        },
                    });

                    //지인 10% 할인 플래그
                    let freindRecommendcheckFlag = false;
                    let remark = '';
                    let orderSortNum = 1;

                    const recommendList = await tx.friendRecommend.findMany({
                        where: {
                            patientId: patient.patient.id,
                            checkFlag: true,
                            useFlag: true,
                            is_del: false,
                        },
                    });
                    console.log(recommendList);
                    /**지인 추천이 세 명이 넘을 때 */
                    if (recommendList.length >= 3) {
                        /**1년 내에 할인 받은 내역 있는지 확인 */
                        const check = await this.checkFriendDiscountInYear(
                            patient.patient.id,
                        );
                        if (check) {
                            freindRecommendcheckFlag = true;
                            console.log('++++++++++++++++++++++++++++');
                            price = getOrderPrice.getTenDiscount();
                            console.log(price);

                            remark = '지인 10% 할인/';
                            for (let i = 0; i < 3; i++) {
                                await tx.friendRecommend.updateMany({
                                    where: { id: recommendList[i].id },
                                    data: { useFlag: false },
                                });
                            }
                        }
                    }

                    if (objPatient.addr && objPatient.addr.includes('제주')) {
                        remark = remark == '' ? '제주' : (remark += '/제주');
                    }

                    if (objPatient.addr && objPatient.addr.includes('울릉')) {
                        remark = remark == '' ? '울릉' : (remark += '/울릉');
                    }

                    const noteData = await tx.patientNote.findMany({
                        where: { patientId: patient.patient.id, useFlag: true },
                    });

                    //특이 사항이 있을 시
                    if (noteData.length > 0) {
                        remark += noteData.join(' ');
                        await tx.patientNote.update({
                            where: { id: noteData[0].id },
                            data: { useFlag: false },
                        });
                    }

                    //////////////////// 클라이언트 요청으로 route 질문 삭제 (복구 시 주석 해제하면 됨) {
                    if (!objOrder.route) objOrder.route = ''; // 주석 해제 시 여기는 지우면 됨
                    if (
                        objOrder.route.includes('파주맘') ||
                        objOrder.route.includes('파주')
                    ) {
                        remark =
                            remark == '' ? '파주맘' : (remark += '/파주맘');
                        orderSortNum = 2;
                    }

                    if (orderSortNum == 2) {
                        const exPatientOrder = await tx.order.findMany({
                            where: { patientId: patient.patient.id },
                        });

                        for (const e of exPatientOrder) {
                            if (e.orderSortNum == 2) {
                                orderSortNum = 1;
                            }
                        }
                    }

                    if (checkGSB(objOrder.route)) {
                        remark =
                            remark == '' ? '구수방' : (remark += '/구수방');
                        orderSortNum = 5;
                    }

                    if (orderSortNum == 5) {
                        const exPatientOrder = await tx.order.findMany({
                            where: { patientId: patient.patient.id },
                        });

                        for (const e of exPatientOrder) {
                            if (e.orderSortNum == 5) {
                                orderSortNum = 1;
                            }
                        }
                    }
                    //////////////////// }

                    const order = await tx.order.create({
                        data: {
                            route: objOrder.route,
                            message: objOrder.message,
                            outage: objOrder.outage,
                            payType: objOrder.payType,
                            cachReceipt: objOrder.cachReceipt,
                            isFirst: false,
                            patientId: patient.patient.id,
                            typeCheck: '',
                            consultingTime: '',
                            essentialCheck: '',
                            price: price,
                            date: kstDate,
                            orderSortNum: orderSortNum, //구수방인지 체크
                            addr: encryptedAddr,
                            friendDiscount: freindRecommendcheckFlag,
                            remark: remark,
                        },
                    });

                    console.log(objOrderItem);
                    console.log('--------------------');
                    const items = [];
                    let assistantFlag = false; //별도 주문만 있는지 체크 플래그
                    let commonFlag = false; // 별도 주문 외에 주문 있는지 체크 플래그

                    for (let i = 0; i < objOrderItem.length; i++) {
                        let tempObj = objOrderItem[i];
                        let temp = {};

                        if (
                            tempObj.type == 'assistant' &&
                            tempObj.item !== ''
                        ) {
                            temp = {
                                item: tempObj.item,
                                type: tempObj.type,
                                orderId: order.id,
                            };
                            //console.log(temp);
                            items.push(temp);
                            assistantFlag = true;
                        } else {
                            if (tempObj.item.length > 0) {
                            }
                            for (let j = 0; j < tempObj.item.length; j++) {
                                temp = {
                                    item: tempObj.item[j],
                                    type: tempObj.type,
                                    orderId: order.id,
                                };

                                //console.log(temp);
                                if (
                                    tempObj.item[j] !==
                                    '개월수선택안함(상담후선택원하는 분/ 별도구매원하는 분) '
                                ) {
                                    console.log('별도 주문 외 주문이 있음');

                                    items.push(temp);
                                    commonFlag = true;
                                }
                            }
                        }
                    }

                    console.log(items);

                    const orderItem = await tx.orderItem.createMany({
                        data: items,
                    });

                    console.log(assistantFlag);
                    console.log(commonFlag);

                    //별도 주문만 있을 때 - orderSortNum - 0
                    if (assistantFlag && !commonFlag) {
                        orderSortNum = 0;
                    }

                    //별도 주문도 추가 일 때 orderSortNum - 2
                    if (assistantFlag && commonFlag) {
                        console.log(orderSortNum + '!!');
                        orderSortNum = 2;
                    }

                    //별도 주문이 없을 때 orderSortNum - 1 혹은 그냥 유지
                    //if(!assistantFlag && commonFlag) {
                    //
                    //}

                    //지인 체크
                    const route = objOrder.route
                        .replace(/\s+/g, '')
                        .replace(/\//g, '');
                    console.log(route);

                    if (route !== '' && orderSortNum != 0) {
                        console.log('지인 체크');

                        const routeName =
                            route.match(/[^\d]+/g) !== null
                                ? route.match(/[^\d]+/g).join('')
                                : null; //지인 이름
                        const routePhoneNum =
                            route.match(/\d+/g) !== null
                                ? route.match(/\d+/g).join('')
                                : null; //지인 번호

                        let checkRecommend;

                        //이름과 전화번호가 둘 다 있어야만 지인 체크
                        if (routeName !== null && routePhoneNum !== null) {
                            checkRecommend = await this.checkRecommend(
                                routeName,
                                routePhoneNum,
                            );

                            //기존에 이 추천인으로 할인 받은 내역 있나 체크
                            const existRecommendCheck =
                                await tx.friendRecommend.findMany({
                                    where: {
                                        patientId: checkRecommend.patientId,
                                    },
                                    select: { order: true },
                                });

                            let existRecommendCheckFlag = true;

                            for (const e of existRecommendCheck) {
                                if (e.order.patientId == patient.patient.id) {
                                    existRecommendCheckFlag = false;
                                }
                            }

                            if (
                                checkRecommend.success &&
                                existRecommendCheckFlag
                            ) {
                                //지인 확인 되었을 시
                                orderSortNum =
                                    orderSortNum == 1 ? 4 : orderSortNum; // 일반일 경우만 지인 처리 (나머지는 그 orderSortNum으로)
                                remark =
                                    remark == ''
                                        ? '지인 10포'
                                        : (remark += '/지인 10포');

                                await tx.friendRecommend.create({
                                    data: {
                                        orderId: order.id,
                                        patientId: checkRecommend.patientId,
                                        checkFlag: true,
                                        date: kstDate,
                                        name: routeName,
                                        phoneNum: routePhoneNum,
                                    },
                                });

                                await tx.order.update({
                                    where: { id: order.id },
                                    data: {
                                        orderSortNum: orderSortNum,
                                        remark: remark,
                                    },
                                });
                            } else {
                                //지인을 입력했을 때 지인 확인이 안될 때
                                await tx.order.update({
                                    where: { id: order.id },
                                    data: { routeFlag: true },
                                });
                            }
                        }
                        // 이벤트용 코드
                        else if (
                            routePhoneNum === null &&
                            route.includes('참새')
                        ) {
                            console.log('////////////////////////////////////');
                            orderSortNum = orderSortNum = 8;
                            remark =
                                remark == ''
                                    ? '이벤트 10포'
                                    : (remark += '/이벤트 10포');

                            await tx.order.update({
                                where: { id: order.id },
                                data: {
                                    orderSortNum: orderSortNum,
                                    remark: remark,
                                },
                            });
                        } else {
                        }
                    } else {
                        //그 외의 경우 마지막으로 orderSortNum 업데이트
                        await tx.order.update({
                            where: { id: order.id },
                            data: { orderSortNum: orderSortNum },
                        });
                    }
                    ////////////////// }
                },
                { timeout: 20000 },
            );

            return { success: true, status: HttpStatus.CREATED };
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
     * 진행되고 있는 주문이 있는지 여부 확인
     * @param name
     * @param socialNum
     * @returns boolean
     */
    async existOrderCheck(name: string, socialNum: string) {
        try {
            console.log(name);
            console.log(socialNum);
            const res = await this.prisma.order.findMany({
                where: {
                    patient: {
                        name: name,
                    },
                    isComplete: false,
                    useFlag: true,
                },
                include: {
                    patient: true,
                },
            });

            console.log(res);

            let check = true;

            for (const e of res) {
                const checkSocialNum = this.crypto.decrypt(e.patient.socialNum);
                console.log(checkSocialNum);
                if (checkSocialNum.includes(socialNum)) {
                    console.log(e);
                    check = false;
                    break;
                }
            }

            return check;
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
     * 1년 내에 할인 받은 내역 있나 확인
     * @param patientId
     * @returns boolean
     */
    async checkFriendDiscountInYear(patientId: number): Promise<boolean> {
        try {
            // 1년 전 날짜 계산
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const check = await this.prisma.order.findMany({
                where: {
                    patientId: patientId,
                    friendDiscount: true,
                    isComplete: true,
                    useFlag: false,
                    date: {
                        gte: oneYearAgo, // 1년 전보다 크거나 같은 데이터만 조회
                    },
                },
            });

            return check.length === 0 ? true : false;
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
     * 오더 수정하기
     * @param surveyDto
     * @param header
     * @param orderId
     * @returns { success: true, status: number }
     */
    async updateOrder(surveyDto: SurveyDto, header: string, orderId: number) {
        try {
            const token = await this.jwtService.decode(header);

            console.log(surveyDto);

            //토큰에 데이터가 아예 없을 때
            if (!token.orderId) {
                return { success: false, status: HttpStatus.FORBIDDEN };
            }
            console.log(typeof token.orderId);
            //토큰 정보와 오더 정보가 다를 때
            if (token.orderId != orderId)
                return { success: false, status: HttpStatus.FORBIDDEN };

            const insertOrder = surveyDto.answers;
            const date = surveyDto.date;

            const objPatient: any = {}; //환자 정보
            const objOrder: OrderObjDto = {
                route: '',
                message: '',
                cachReceipt: '',
                typeCheck: '',
                consultingTime: '',
                payType: '',
            }; //오더 정보
            const objOrderBodyType: any = {}; //초진 시 건강 응답 정보
            const objOrderItem: any = []; //오더 아이템 정보

            insertOrder.forEach((e) => {
                //console.log(e)
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    const obj = {
                        item: e.answer,
                        type: e.code,
                    };
                    objOrderItem.push(obj);
                } else if (e.orderType == 'orderBodyType') {
                    objOrderBodyType[`${e.code}`] = e.answer;
                } else {
                    throw new HttpException(
                        {
                            success: false,
                            status: HttpStatus.BAD_REQUEST,
                        },
                        HttpStatus.BAD_REQUEST,
                    );
                }
            });
            console.log(objPatient.addr);
            const encryptedAddr = this.crypto.encrypt(objPatient.addr);

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.update({
                    where: {
                        id: token.patientId,
                    },
                    data: {
                        addr: encryptedAddr,
                    },
                });

                let price = 0;

                const items = objOrderItem.map((item) => ({
                    item: item.item,
                    type: item.type,
                    orderId: token.orderId,
                }));

                console.log(items);
                const itemList = await this.getItems();
                const getOrderPrice = new GetOrderSendPrice(
                    items,
                    itemList,
                    false,
                    encryptedAddr,
                ); //주문 가격
                price = getOrderPrice.getPrice();
                console.log(price);

                //지인 10% 할인 플래그
                const exOrder = await tx.order.findUnique({
                    where: { id: token.orderId },
                    select: { friendDiscount: true },
                });

                if (exOrder.friendDiscount) {
                    price = price * 0.9;

                    await tx.friendRecommend.updateMany({
                        where: {
                            patientId: token.patientId,
                            checkFlag: true,
                            useFlag: true,
                        },
                        data: { useFlag: false },
                    });
                }

                const order = await tx.order.update({
                    where: {
                        id: token.orderId,
                    },
                    data: {
                        payType: objOrder.payType,
                        price: price,
                        addr: encryptedAddr,
                    },
                });

                await tx.orderItem.deleteMany({
                    where: {
                        orderId: token.orderId,
                    },
                });

                const orderItem = await tx.orderItem.createMany({
                    data: items,
                });
            });

            return { success: true, status: HttpStatus.CREATED };
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
     * 환자 정보 찾기
     * @param name
     * @param socialNum
     * @returns {success:boolean,id:number}
     */
    async checkPatient(objPatient: PatientDto) {
        try {
            const res = await this.prisma.patient.findMany({
                where: {
                    name: objPatient.name,
                },
                select: {
                    id: true,
                    addr: true,
                    socialNum: true,
                },
            });

            console.log(res);

            let check = false;
            let matched: any = {};

            for (const e of res) {
                const checkSocialNum = this.crypto.decrypt(e.socialNum);
                if (checkSocialNum.includes(objPatient.socialNum)) {
                    matched = { ...e };
                    check = true;
                }
            }

            if (res.length === 0) return { success: check };
            else return { success: check, patient: matched };
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
     * 유선 상담 목록으로 이동
     * @param callConsultingDto
     * @returns {success:boolean,status:number}
     */
    async callConsulting(callConsultingDto: CallConsultingDto) {
        try {
            await this.prisma.order.update({
                where: {
                    id: callConsultingDto.orderId,
                    patientId: callConsultingDto.userId,
                },
                data: {
                    consultingType: true,
                    consultingFlag: true,
                },
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
     * 유선 상담 목록 조회
     * @returns
     */
    async getCallList(header: string, getListDto: GetListDto) {
        try {
            console.log(getListDto);
            //등급 조회
            // const checkAdmin = await this.adminService.checkAdmin(header);
            // if (!checkAdmin.success) return { success: false, status: HttpStatus.FORBIDDEN, msg: '권한이 없습니다' };

            console.log(getListDto);

            let orderConditions = {};
            if (getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    consultingType: true,
                    isComplete: false,
                    useFlag: true,
                };
            } else {
                const { startDate, endDate } =
                    getListDto.month === undefined
                        ? getDayStartAndEnd(getListDto.date)
                        : getFirstAndLastDayOfOnlyMonth(getListDto.month);

                orderConditions = {
                    consultingType: true,
                    isComplete: false,
                    useFlag: true,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                };
            }
            let patientConditions = {};
            if (getListDto.searchKeyword !== '') {
                //검색어 O
                patientConditions = {
                    patient: { name: { contains: getListDto.searchKeyword } },
                };
            }
            const list = await this.prisma.order.findMany({
                where: { ...orderConditions, ...patientConditions },
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
                    isPickup: true,
                    price: true,
                    addr: true,
                    notCall: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                            socialNum: true,
                            patientBodyType: {
                                select: {
                                    tallWeight: true,
                                    digestion: true,
                                    sleep: true,
                                    constipation: true,
                                    nowDrug: true,
                                    pastDrug: true,
                                    pastSurgery: true,
                                },
                            },
                        },
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        },
                    },
                },
            });

            const sortedList = sortItems(list);

            for (let row of sortedList) {
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPatientAddr = this.crypto.decrypt(
                    row.patient.addr,
                );
                const decryptedPatientSocialNum = this.crypto.decrypt(
                    row.patient.socialNum,
                );

                row.patient.phoneNum = decryptedPhoneNum;
                row.addr = decryptedAddr;
                row.patient.addr = decryptedPatientAddr;
                row.patient.socialNum = decryptedPatientSocialNum;
            }

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
     * 유선 상담 미연결 처리
     * @param id
     * @returns {success: boolean, status: HttpStatus, msg: stirng}
     */
    async notCall(id: number) {
        try {
            console.log(id);
            await this.prisma.order.update({
                where: { id: id },
                data: { notCall: true },
            });

            return { success: true, status: 201, msg: '업데이트 완료' };
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
     * 유선 상담 완료 처리
     * @param callConsultingDto
     * @returns {success:boolean,status:number}
     */
    async callComplete(callConsultingDto: CallConsultingDto, header: string) {
        try {
            // const checkAdmin = await this.adminService.checkAdmin(header);
            // if (!checkAdmin.success) return { success: false, status: HttpStatus.FORBIDDEN }; //일반 유저 거르기

            //유선 상담 완료 처리
            await this.prisma.order.update({
                where: {
                    id: callConsultingDto.orderId,
                    patientId: callConsultingDto.userId,
                },
                data: {
                    consultingType: false,
                    phoneConsulting: true,
                    notCall: false,
                },
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
     * 유선 상담에서 입금 상담으로 이동
     * @param callConsultingDto
     * @returns { success: boolean, status: number}
     */
    async callToRec(callConsultingDto: CallConsultingDto) {
        try {
            await this.prisma.order.update({
                where: {
                    id: callConsultingDto.orderId,
                    patientId: callConsultingDto.userId,
                },
                data: {
                    consultingType: false,
                },
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
     * 총 금액과 card, cash 결제액 합이 일치하는지
     */
    async checkPaymentAmount(id: number) {
        try {
            const { price, card, cash } = await this.prisma.order.findUnique({
                where: {
                    id: id,
                },
                select: {
                    price: true,
                    card: true,
                    cash: true,
                },
            });
            if (price !== card + cash) {
                return { success: false };
            }
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
     * 발송 목록으로 이동 처리(상담 완료 처리)
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async completeConsulting(id: number) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: id },
                select: {
                    tempOrders: {
                        select: { orderSortNum: true },
                    },
                    payType: true,
                    price: true,
                },
            });

            //console.log(order);
            //분리 배송, 합배송일 시 tempOrder는 생성하지 않는다.
            //분리 배송, 합배송 시 미리 생성되기 때문
            if (
                order.tempOrders.length > 0 &&
                (order.tempOrders[0].orderSortNum == 7 ||
                    order.tempOrders[0].orderSortNum == 6)
            ) {
                await this.prisma.order.update({
                    where: {
                        id: id,
                    },
                    data: {
                        isComplete: true,
                        card: order.payType == '카드결제' ? order.price : 0,
                        cash: order.payType == '계좌이체' ? order.price : 0,
                        payFlag: 1,
                        talkFlag: true,
                        consultingFlag: true,
                    },
                });

                return { success: true, status: HttpStatus.OK };
            } else {
                //트랜젝션 시작
                await this.prisma.$transaction(async (tx) => {
                    //발송 목록으로 이동 처리
                    const sendOne = await tx.order.update({
                        where: {
                            id: id,
                        },
                        data: {
                            isComplete: true,
                            card: order.payType == '카드결제' ? order.price : 0,
                            cash: order.payType == '계좌이체' ? order.price : 0,
                            payFlag: 1,
                            consultingFlag: true,
                            talkFlag: true,
                        },
                    });

                    //해당 오더 발송 개수 가져오기
                    const orderItems = await tx.orderItem.findMany({
                        where: {
                            orderId: id,
                            type: { in: ['common', 'yoyo'] },
                        },
                    });

                    // console.log(`-----------${orderItems.length}-----------`);
                    // console.log(orderItems);

                    //오더 개수
                    const orderAmount = getItemOnlyLen(orderItems);
                    console.log('////////////////////////');

                    console.log(orderAmount);
                    const sendListId = await this.insertToSendList(
                        tx,
                        orderAmount,
                    );
                    console.log('sendListId: ' + sendListId);
                    const res = await this.createTempOrder(
                        sendOne,
                        id,
                        sendListId,
                        tx,
                    );

                    if (!res.success) throw error();
                });
            }

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException(
                {
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                },
                err.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 발송목록에 넣기
     * @param tx
     * @param orderAmount 주문 수량
     * @param sendOne 오더
     * @param id 오더 아이디
     * @returns
     */
    async insertToSendList(tx, orderAmount) {
        try {
            //발송 목록 데이터 확인. 많이 나와봐야 두 개 임
            const sendList = await tx.sendList.findMany({
                where: {
                    full: false,
                    fixFlag: false, //픽스 여부 체크
                    useFlag: true,
                },
                orderBy: {
                    id: 'asc',
                },
                select: {
                    id: true,
                    amount: true,
                    title: true,
                },
            });

            console.log('sendList Len : ' + sendList.length);

            //아직 발송량이 차지 않은 발송 목록이 있을 때
            if (sendList.length > 0) {
                const checkAmount = sendList[0].amount + orderAmount; //기존 발송목록과 추가되는 오더의 개수 더한거

                const volumeDatas =
                    await this.adminService.getAllDeliveryVolumeForERP(); // 전체 요일 발송량 데이터

                // console.log(sendList[0].title); // ex) '2024/8/22'
                const sendListDate = new Date(sendList[0].title);

                const day = getDayOfWeek(sendListDate.getDay());
                // console.log(day); // 'sunday' ~ 'saturday' 중 1

                const volumeData = volumeDatas.data.filter((e) => {
                    return e.day_of_week === day;
                });

                const maxVolume = volumeData[0].volume; // 해당 발송 목록 요일에 맞는 발송량

                // console.log("maxVolume: " + maxVolume);
                // console.log(checkAmount);

                if (checkAmount > maxVolume) {
                    //해당 요일에 맞는 발송량 개수가 넘으면 새로운 발송목록에 삽입
                    if (sendList.length == 1) {
                        //새로 삽입할 발송목록이 없어 새로 만들어야 될 때
                        const sendList = await tx.sendList.findMany({
                            orderBy: {
                                id: 'asc',
                            },
                            select: {
                                id: true,
                                amount: true,
                                title: true,
                            },
                        }); //제일 마지막 발송일자 가져오기
                        const lastTitle = sendList[sendList.length - 1].title;
                        const date =
                            new Date(lastTitle) > new Date()
                                ? new Date(lastTitle)
                                : new Date();
                        const title = getSendTitle(date);
                        console.log(title);

                        // 여기서 검증
                        const checkedTitle = await this.checkIsHoliday(
                            tx,
                            new Date(title),
                        );

                        const newSendList = await tx.sendList.create({
                            data: {
                                title: checkedTitle,
                                amount: orderAmount,
                                date: date,
                                full: false,
                            },
                        });

                        return newSendList.id;
                    } else {
                        //다 차지 않은 발송목록이 있어서 해당 발송 목록 발송량 체크
                        const nextCheckAmount =
                            sendList[1].amount + orderAmount;

                        const nextSendListDate = new Date(sendList[1].title);

                        const nextDay = getDayOfWeek(nextSendListDate.getDay());

                        const nextVolumeData = volumeDatas.data.filter((e) => {
                            return e.day_of_week === nextDay;
                        });

                        const nextMaxVolume = nextVolumeData[0].volume;

                        await tx.sendList.update({
                            where: {
                                id: sendList[1].id,
                            },
                            data: {
                                amount: nextCheckAmount,
                            },
                        });

                        // 해당 발송량을 딱 맞추기 어려우니 이 안에 들어오면 그냥 fix
                        if (
                            nextCheckAmount > nextMaxVolume - 5 &&
                            nextCheckAmount <= nextMaxVolume
                        ) {
                            await this.fixSendList(sendList[1].id, tx);
                        }

                        return sendList[1].id;
                    }
                } else {
                    //해당 요일 발송량 이하면 기존 발송목록에 삽입
                    const checkAmount = sendList[0].amount + orderAmount;

                    if (checkAmount == maxVolume) {
                        await tx.sendList.update({
                            where: {
                                id: sendList[0].id,
                            },
                            data: {
                                full: true,
                                fixFlag: true, //해당 요일에 맞는 발송량이 되면 자동으로 fix
                                amount: checkAmount,
                            },
                        });

                        await this.fixSortNum(sendList[0].id, tx);
                    } else {
                        await tx.sendList.update({
                            where: {
                                id: sendList[0].id,
                            },
                            data: {
                                amount: checkAmount,
                            },
                        });
                    }

                    // 해당 발송량을 딱 맞추기 어려우니 이 안에 들어오면 그냥 fix
                    if (
                        checkAmount > maxVolume - 5 &&
                        checkAmount <= maxVolume
                    ) {
                        await this.fixSendList(sendList[0].id, tx);
                    }

                    return sendList[0].id;
                }
            } else {
                //새로 발송목록을 만들어야 할 때
                console.log('create new send list');
                const sendList = await tx.sendList.findMany({
                    orderBy: {
                        id: 'asc',
                    },
                    select: {
                        id: true,
                        amount: true,
                        title: true,
                    },
                }); //제일 마지막 발송일자 가져오기
                console.log(sendList);

                const lastTitle =
                    sendList.length != 0
                        ? sendList[sendList.length - 1].title
                        : new Date();
                const date =
                    new Date(lastTitle) > new Date()
                        ? new Date(lastTitle)
                        : new Date();
                console.log(date);
                const title = getSendTitle(date);
                //console.log(title);

                // 여기서 검증
                const checkedTitle = await this.checkIsHoliday(
                    tx,
                    new Date(title),
                );

                const newSendList = await tx.sendList.create({
                    data: {
                        title: checkedTitle,
                        amount: orderAmount,
                        date: date,
                        full: false,
                    },
                });

                return newSendList.id;
            }
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
     *  //temp order에 데이터를 삽입해
        order 수정 시에도 발송목록에서 순서가 변하지 않도록 조정
     * @param sendOne 
     * @param id 
     * @param sendListId 
     * @param tx 
     * @returns Promise<{
            success: boolean;
            status?: undefined;
        }
     */
    async createTempOrder(sendOne, id, sendListId, tx, address?: string) {
        try {
            // if (address == undefined) {
            //     //발송되는 주소 가져오기
            //     const patient = await tx.patient.findUnique({
            //         where: {
            //             id: sendOne.patientId
            //         },
            //         select: {
            //             addr: true,
            //         }
            //     });

            //     address = patient.addr
            // }

            let encryptedAddr;
            if (address == undefined) {
                encryptedAddr = sendOne.addr;
            } else {
                encryptedAddr = this.crypto.encrypt(address);
            }

            //temp order에 데이터를 삽입해
            //order 수정 시에도 발송목록에서 순서가 변하지 않도록 조정
            // console.log(id);
            // console.log(sendListId);
            // console.log(sendOne);

            const sendList = await tx.tempOrder.aggregate({
                where: {
                    sendListId: sendListId,
                },
                _max: {
                    sortFixNum: true,
                },
            });

            // console.log('==================')
            // console.log(sendList._max.sortFixNum)

            const max = sendList._max.sortFixNum;

            const res = await tx.tempOrder.create({
                data: {
                    route: sendOne.route,
                    message: sendOne.message,
                    cachReceipt: sendOne.cachReceipt,
                    typeCheck: sendOne.typeCheck,
                    consultingTime: sendOne.consultingTime,
                    payType: sendOne.payType,
                    essentialCheck: sendOne.essentialCheck,
                    outage: sendOne.outage,
                    consultingType: sendOne.consultingType,
                    phoneConsulting: sendOne.phoneConsulting,
                    isComplete: sendOne.isComplete,
                    isFirst: sendOne.isFirst,
                    date: sendOne.date,
                    orderSortNum: sendOne.orderSortNum,
                    addr: encryptedAddr,
                    sortFixNum: max == 0 || max == null ? 0 : max + 1,
                    order: {
                        connect: { id: id },
                    },
                    patient: {
                        connect: { id: sendOne.patientId },
                    },
                    sendList: {
                        connect: { id: sendListId },
                    },
                },
            });

            return { success: true, id: res.id };
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
     * 지정된 발송목록에 오더 넣기
     * @param completeSetSendDto 
     * @returns Promise<{
        success: boolean;
        status: HttpStatus;
    }>
     */
    async completeConsultingSetSend(completeSetSendDto: CompleteSetSendDto) {
        try {
            const orderId = completeSetSendDto.orderId;
            const sendListId = completeSetSendDto.sendListId;

            await this.prisma.$transaction(async (tx) => {
                const exOrder = await tx.order.findUnique({
                    where: { id: orderId },
                    select: {
                        price: true,
                    },
                });

                const sendOne = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        isComplete: true,
                        consultingFlag: true,
                        cash: exOrder.price, //계좌이체의 경우 원내장부에 올라가야 되서 현금결제로 금액 입력
                    },
                });

                // //발송 주소 가져오기
                // const patient = await tx.patient.findUnique({
                //     where: { id: sendOne.patientId },
                //     select: { addr: true }
                // });

                // const addr = patient.addr;

                const orderItems = await tx.orderItem.findMany({
                    where: {
                        orderId: orderId,
                        type: { in: ['common', 'yoyo'] },
                    },
                });

                const orderAmount = orderItems.length;

                const sendList = await tx.sendList.findUnique({
                    where: { id: sendListId },
                });

                const amount = sendList.amount + orderAmount;

                await tx.sendList.update({
                    where: { id: sendListId },
                    data: { amount: amount },
                });

                const res = await this.createTempOrder(
                    sendOne,
                    orderId,
                    sendListId,
                    tx,
                );
                if (res.success)
                    return { success: true, status: HttpStatus.OK };
                else
                    return {
                        success: false,
                        status: HttpStatus.INTERNAL_SERVER_ERROR,
                    };
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
     * 신규 환자 등록 용 엑셀
     * @param date
     * @returns {success:true,status:HttpStatus.OK,url};
     */
    async newPatientExcel(date: string) {
        try {
            //신환 :  이름 주소 주민번호 핸드폰번호
            const { startDate, endDate } = getDayStartAndEnd(date);

            console.log(startDate);
            console.log(endDate);
            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    // isComplete: false,
                    isFirst: true,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
                select: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            phoneNum: true,
                            socialNum: true,
                        },
                    },
                    id: true,
                    addr: true,
                    route: true,
                    newPatientFlag: true,
                },
            });

            console.log(list);

            if (list.length == 0) {
                return { success: true, msg: '해당 일자에 초진이 없습니다' };
            }

            for (let row of list) {
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                const decryptedSocialNum = this.crypto.decrypt(
                    row.patient.socialNum,
                );
                row.addr = decryptedAddr;
                row.patient.phoneNum = decryptedPhoneNum;
                row.patient.socialNum = decryptedSocialNum;
            }

            const returnList = await this.prisma.order.findMany({
                where: {
                    // isComplete: false,
                    isFirst: false,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
                select: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            phoneNum: true,
                            socialNum: true,
                        },
                    },
                    id: true,
                    // addr: true,
                    route: true,
                    newPatientFlag: true,
                },
            });

            for (let row of returnList) {
                // const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                const decryptedSocialNum = this.crypto.decrypt(
                    row.patient.socialNum,
                );
                // row.addr = decryptedAddr;
                row.patient.phoneNum = decryptedPhoneNum;
                row.patient.socialNum = decryptedSocialNum;
            }

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet('신환 등록');

            //const headers = ['이름', '주소', '주민번호', '휴대폰 번호'];
            const headers = [
                '주소',
                '주민번호',
                '이름',
                '휴대폰 번호',
                '설문지번호',
                '특이사항(추천인)',
            ];

            const headerWidths = [30, 30, 10, 20, 10, 20];

            //상단 헤더 추가
            const headerRow = sheet.addRow(headers);
            //헤더의 높이값 지정
            headerRow.height = 30.75;
            // 각 헤더 cell에 스타일 지정
            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            const hyphen = new GetHyphen('');
            //각 data cell에 데이터 삽입
            list.forEach((e) => {
                const { name, socialNum, phoneNum } = e.patient;
                const addr = e.addr;
                const rowDatas = [
                    addr,
                    hyphen.socialNumHyphen(socialNum),
                    name,
                    hyphen.phoneNumHyphen(phoneNum),
                    e.id,
                    e.route,
                ];
                const appendRow = sheet.addRow(rowDatas);
                if (e.newPatientFlag) {
                    appendRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'dcdcdc' },
                    };
                }
            });

            const sheet2 = wb.addWorksheet('재진');
            const headers2 = [
                '이름',
                '주민번호',
                '휴대폰 번호',
                '특이사항(추천인)',
                '설문지번호',
            ];
            const headerWidths2 = [10, 30, 20, 20, 15];

            //상단 헤더 추가
            const headerRow2 = sheet2.addRow(headers2);
            //헤더의 높이값 지정
            headerRow2.height = 30.75;
            // 각 헤더 cell에 스타일 지정
            headerRow2.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet2.getColumn(colNum).width = headerWidths2[colNum - 1];
            });

            //각 data cell에 데이터 삽입
            returnList.forEach((e) => {
                const { name, phoneNum, socialNum } = e.patient;
                const rowDatas = [
                    name,
                    socialNum,
                    hyphen.phoneNumHyphen(phoneNum),
                    e.route,
                    e.id,
                ];
                const appendRow = sheet2.addRow(rowDatas);

                if (e.newPatientFlag) {
                    appendRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'dcdcdc' },
                    };
                }
            });

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.uploadFile(fileData);

            await this.prisma.order.update({
                where: { id: list[list.length - 1].id },
                data: { newPatientFlag: true },
            });

            await this.prisma.order.update({
                where: { id: returnList[returnList.length - 1].id },
                data: { newPatientFlag: true },
            });

            return { success: true, status: HttpStatus.OK, url };
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
     * 엑셀 파일 업로드
     * @param file
     * @returns fileUrl : String
     */
    async uploadFile(file: any) {
        try {
            const presignedUrl = await generateUploadURL();

            console.log(presignedUrl);
            await this.saveS3Data(
                presignedUrl.uploadURL.split('?')[0],
                presignedUrl.imageName,
            );

            await axios.put(
                presignedUrl.uploadURL,
                {
                    body: file,
                },
                {
                    headers: {
                        'Content-Type': file.type,
                    },
                },
            );

            let fileUrl = presignedUrl.uploadURL.split('?')[0];
            return fileUrl;
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

    async s3Url() {
        const url = await generateUploadURL();
        return { url: url.uploadURL };
    }

    /**
     * 발송 목록으로 이동
     * @param id 
     * @returns {success:true, status:HttpStatus.OK};

     */
    async goToSendList(id: number) {
        try {
            await this.prisma.order.update({
                where: {
                    id: id,
                },
                data: {
                    isComplete: true,
                },
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
     * 지인 확인
     * @param route
     * @returns {success: boolean, status: HttpStatus.OK, check: boolean}
     */
    async checkAcquaintance(route: string) {
        try {
            const res = await this.prisma.patient.findMany({
                where: {
                    name: route,
                },
                select: {
                    name: true,
                },
            });
            if (res.length >= 1)
                return { success: true, check: true, status: HttpStatus.OK };
            else return { success: true, check: false, status: HttpStatus.OK };
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
     * 직원이 환자 order 업데이트
     * @param {UpdateSurveyDto, id}
     * @returns {success: boolean, status: HttpStatus.OK}
     */
    async updateOrderByStaff(updateSurveyDto, id) {
        try {
            const encryptedPhoneNum = this.crypto.encrypt(
                updateSurveyDto.patient.phoneNum,
            );
            const encryptedAddr = this.crypto.encrypt(updateSurveyDto.addr);

            const patientData = {
                ...updateSurveyDto.patient,
                phoneNum: encryptedPhoneNum,
                addr: encryptedAddr,
            };
            const orderItemsData = updateSurveyDto.orderItems.filter((item) => {
                return item.item !== '';
            });

            delete updateSurveyDto.patient;
            delete updateSurveyDto.orderItems;

            const items = orderItemsData.map((item) => ({
                item: item.item,
                type: item.type,
                orderId: id,
            }));
            console.log(items);
            const itemList = await this.getItems();

            const order = await this.prisma.order.findUnique({
                where: { id: id },
                select: {
                    orderSortNum: true,
                    price: true,
                    tempOrders: {
                        select: {
                            orderSortNum: true,
                        },
                    },
                    friendDiscount: true,
                    addr: true,
                },
            });

            const encryptAddr = this.crypto.decrypt(order.addr);

            const getOrderPrice = new GetOrderSendPrice(
                orderItemsData,
                itemList,
                updateSurveyDto.isPickup,
                encryptAddr,
            );

            let price =
                order.tempOrders.length > 0 &&
                order.tempOrders[0].orderSortNum == 7
                    ? order.price
                    : getOrderPrice.getPrice(); //분리배송일 때 택배비가 달라질 수 있기 때문

            //지인 10퍼센트 할인 시 할인 처리
            if (order.friendDiscount) {
                price = getOrderPrice.getTenDiscount();
            }
            let orderSortNum = updateSurveyDto.isPickup
                ? -1
                : updateSurveyDto.orderSortNum === -1
                  ? 1
                  : updateSurveyDto.orderSortNum;
            const orderData = {
                ...updateSurveyDto,
                price: price,
                orderSortNum: orderSortNum,
                addr: encryptedAddr,
                consultingFlag: true,
            };

            console.log('====================');

            delete orderData.id;
            delete orderData.friendRecommends;

            console.log(orderData);

            const res = await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.update({
                    where: {
                        id: id,
                    },
                    data: orderData,
                });

                const patient = await tx.patient.update({
                    where: {
                        id: patientData.id,
                    },
                    data: patientData,
                });

                const deleteItems = await tx.orderItem.deleteMany({
                    where: {
                        orderId: id,
                    },
                });

                const insertItems = await tx.orderItem.createMany({
                    data: items,
                });
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
     * 원장님이 환자 order 업데이트
     * @param {UpdateSurveyDto, id}
     * @returns {success: boolean, status: HttpStatus.OK}
     */
    async updateOrderByDoc(updateSurveyDto, id) {
        try {
            const encryptedPhoneNum = this.crypto.encrypt(
                updateSurveyDto.patient.phoneNum,
            );
            const encryptedAddr = this.crypto.encrypt(updateSurveyDto.addr);
            const encryptedSocialNum = this.crypto.encrypt(
                updateSurveyDto.patient.socialNum,
            );

            const patientData = {
                ...updateSurveyDto.patient,
                phoneNum: encryptedPhoneNum,
                addr: encryptedAddr,
                socialNum: encryptedSocialNum,
            };
            const orderItemsData = updateSurveyDto.orderItems.filter((item) => {
                return item.item !== '';
            });
            const orderBodyTypeData = updateSurveyDto.orderBodyType;

            delete updateSurveyDto.patient;
            delete updateSurveyDto.orderItems;
            delete updateSurveyDto.orderBodyType;

            const items = orderItemsData.map((item) => ({
                item: item.item,
                type: item.type,
                orderId: id,
            }));
            console.log(items);

            //지인 10퍼센트 할인 시 할인 처리
            const exOrder = await this.prisma.order.findUnique({
                where: { id: id },
                select: {
                    friendDiscount: true,
                    addr: true,
                },
            });

            const encryptAddr = this.crypto.decrypt(exOrder.addr);

            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(
                orderItemsData,
                itemList,
                updateSurveyDto.isPickup,
                encryptAddr,
            );
            let price = getOrderPrice.getPrice();

            if (exOrder.friendDiscount) {
                price = price * 0.9;
            }
            const orderData = {
                ...updateSurveyDto,
                price: price,
                addr: encryptedAddr,
            };

            const res = await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.update({
                    where: {
                        id: id,
                    },
                    data: orderData,
                });

                delete patientData.patientBodyType;

                const patient = await tx.patient.update({
                    where: {
                        id: patientData.id,
                    },
                    data: patientData,
                });

                if (orderBodyTypeData !== null) {
                    await tx.patientBodyType.update({
                        where: {
                            patientId: patientData.id,
                        },
                        data: {
                            tallWeight: orderBodyTypeData.tallWeight ?? '',
                            digestion: orderBodyTypeData.digestion ?? '',
                            sleep: orderBodyTypeData.sleep ?? '',
                            constipation: orderBodyTypeData.constipation ?? '',
                            nowDrug: orderBodyTypeData.nowDrug ?? '',
                            pastDrug: orderBodyTypeData.pastDrug ?? '',
                            pastSurgery: orderBodyTypeData.pastSurgery ?? '',
                        },
                    });
                }

                const deleteItems = await tx.orderItem.deleteMany({
                    where: {
                        orderId: id,
                    },
                });

                const insertItems = await tx.orderItem.createMany({
                    data: items,
                });
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
     * 입금 내역 엑셀 파일 업로드 및 발송목록으로 이동(부정확한 데이터 리턴)
     * @param insertCashDto
     * @returns {success:boolean, url:string}
     */
    async cashExcel(insertCashDto: InsertCashDto) {
        try {
            //console.log(insertCashDto);
            const { startDate, endDate } = getDayStartAndEnd(
                insertCashDto.date,
            );
            const cashList = await this.getCashTypeList(startDate, endDate);
            const itemList = await this.getItems();
            //console.log(cashList);
            //console.log(insertCashDto);
            const cashMatcher = new CashExcel(
                insertCashDto.cashExcelDto,
                cashList.list,
                itemList,
            );
            const results = cashMatcher.compare();
            // console.log('=========================');
            // console.log(results);
            //엑셀 생성
            const createExcel = await createExcelCash(
                results.duplicates,
                results.noMatches,
            );
            const url = createExcel.url;
            const objectName = createExcel.objectName;

            await this.saveS3Data(url, objectName);

            //발송목록 이동 처리 & cash column 업데이트(계좌이체로 금액 전부 결제한 사람들)
            for (const e of results.matches) {
                await this.completeConsulting(e.id);
                await this.cashUpdate(e.id, e.price);
            }

            // const firstTenMatches = results.matches.slice(0, 10);
            // const promises = firstTenMatches.map(async (e) => {
            //     await this.completeConsulting(e.id);
            //     await this.cashUpdate(e.id, e.price);
            //   });

            //   await Promise.all(promises).then((value) => {
            //     //console.log(value);
            //     return { success: true, status: HttpStatus.OK };
            // }).catch((err) => {
            //     this.logger.error(err);
            //     return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR };
            // });

            return { success: true, url };
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

    /**item 테이블 데이터 가져오기 */
    async getItems() {
        try {
            const list = await this.prisma.item.findMany();

            return list;
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
     * cash column 업데이트(계좌이체로 금액 전부 결제한 사람들)
     * @param id 
     * @param price 
     * @returns Promise<{
            success: boolean;
        }>
     */
    async cashUpdate(id: number, price: number) {
        try {
            await this.prisma.order.update({
                where: { id: id },
                data: {
                    cash: price,
                    payFlag: 1,
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

    async getCashTypeList(startDate, endDate) {
        try {
            const list = await this.prisma.order.findMany({
                where: {
                    date: {
                        gte: startDate, // 시작 시간 이상
                        lte: endDate, // 종료 시간 이하
                    },
                    consultingType: false,
                    isComplete: false,
                    payType: '계좌이체',
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
                    price: true,
                    orderSortNum: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        },
                    },
                    orderItems: {
                        select: {
                            id: true,
                            item: true,
                            type: true,
                        },
                    },
                },
            });

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
     * 가격 일괄 업데이트
     * @returns {success:boolean, status:number}
     */
    async updatePrice() {
        try {
            const itemList = await this.getItems();
            const list = await this.prisma.order.findMany({
                orderBy: {
                    id: 'asc',
                },
                select: {
                    orderItems: true,
                    id: true,
                },
            });

            console.log(list);
            list.forEach(async (e) => {
                console.log(e.id);

                const getOrderPrice = new GetOrderSendPrice(
                    e.orderItems,
                    itemList,
                );
                const price = getOrderPrice.getPrice();
                console.log(e.id + ' / ' + price);
                await this.prisma.order
                    .update({
                        where: { id: e.id },
                        data: { price: price },
                    })
                    .catch((err) => console.log(err));
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
     * 입금 상담 목록에서 합배송 처리
     * @param combineOrderDto 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async combineOrder(combineOrderDto: CombineOrderDto) {
        try {
            console.log(combineOrderDto.orderIdArr);
            await this.prisma.$transaction(async (tx) => {
                const maxCombineNum = await tx.order.aggregate({
                    _max: {
                        combineNum: true,
                    },
                });

                let newCombineNum = (maxCombineNum._max.combineNum || 0) + 1;

                //새 combine order 삽입
                await tx.order.updateMany({
                    where: {
                        id: {
                            in: [...combineOrderDto.orderIdArr],
                        },
                        // 발송 목록도 합배송 처리를 위해 주석 처리
                        // isComplete: false
                    },
                    data: {
                        combineNum: newCombineNum,
                        //기존 orderSortNum을 가져가야 되는 이슈가 생겨
                        //orderSortNum은 업데이트하지 않기로 하겠습니다.
                        // orderSortNum: 5 //orderSortNum update!
                    },
                });

                const orders = await tx.order.findMany({
                    where: {
                        id: {
                            in: [...combineOrderDto.orderIdArr],
                        },
                    },
                });

                console.log('오와아아앙 열받는다');
                console.log(orders);

                let orderItems = 0;

                for (let i = 0; i < orders.length; i++) {
                    const orderItem = await tx.orderItem.findMany({
                        where: {
                            orderId: orders[i].id,
                            type: { in: ['common', 'yoyo'] },
                        },
                    });

                    orderItems += orderItem.length;
                }

                if (orderItems == 1) {
                    //합배송 주문 처리 되는 모든 주문을 합쳤을 때 택배비를 받아야하는 금액 처리
                    for (let i = 0; i < orders.length; i++) {
                        const orderItem = await tx.orderItem.findMany({
                            where: {
                                orderId: orders[i].id,
                                type: { in: ['common', 'yoyo'] },
                            },
                        });

                        //이럴 경우 별도 주문을 한 사람에게 택배비가 부과됩니다.
                        //따라서 별도 주문을 하지 않은 사람은 택배비를 빼줘야 합니다.
                        if (orderItem.length != 0) {
                            await tx.order.update({
                                where: { id: orders[i].id },
                                data: { price: orders[i].price - 3500 },
                            });
                        }
                    }
                } else {
                    //합배송 시 택배비를 면제해주는 금액처리
                    for (let i = 0; i < orders.length; i++) {
                        const orderItem = await tx.orderItem.findMany({
                            where: {
                                orderId: orders[i].id,
                                type: { in: ['common', 'yoyo'] },
                            },
                        });

                        if (checkSend(orderItem)) {
                            await tx.order.update({
                                where: { id: orders[i].id },
                                data: { price: orders[i].price - 3500 },
                            });
                        }
                    }
                }

                let sendListIdCheck = [];
                for (let i = 0; i < orders.length; i++) {
                    const isInTempOrderRes = await this.isInTempOrder(
                        orders[i].id,
                    );
                    const check = isInTempOrderRes.check;
                    const sendListId = isInTempOrderRes.sendListId;

                    if (check) {
                        sendListIdCheck.push(sendListId);
                    }
                }

                let sendListId;

                if (sendListIdCheck.length === 0) {
                    // 입금 + 입금 합배송 시 발송 목록 현황에 따라 snedListId 할당
                    sendListId = await this.insertToSendList(tx, orderItems);
                } else {
                    // 입금 + 발송 합배송 시 발송 목록에 포함된 주문의 발송일자에 추가
                    sendListId = sendListIdCheck[0];
                }

                // const sendListId = await this.insertToSendList(tx, orderItems);

                const encryptedAddr = this.crypto.encrypt(combineOrderDto.addr);

                for (let i = 0; i < orders.length; i++) {
                    const isInTempOrderRes = await this.isInTempOrder(
                        orders[i].id,
                    );
                    const check = isInTempOrderRes.check;
                    if (check) {
                        // 발송 목록에 있는 항목이면 update
                        const tempOrder = await tx.tempOrder.updateMany({
                            where: {
                                orderId: orders[i].id,
                            },
                            data: {
                                orderSortNum: 6,
                            },
                        });

                        const order = await tx.order.update({
                            where: {
                                id: orders[i].id,
                            },
                            data: {
                                combineNum: newCombineNum,
                            },
                        });
                    } else {
                        // 아니면 create
                        let card =
                            orders[i].payType == '카드결제'
                                ? orders[i].price
                                : 0;
                        let cash =
                            orders[i].payType == '계좌이체'
                                ? orders[i].price
                                : 0;

                        await tx.order.update({
                            where: { id: orders[i].id },
                            data: {
                                card: card,
                                cash: cash,
                            },
                        });

                        const res = await tx.tempOrder.create({
                            data: {
                                route: orders[i].route,
                                message: orders[i].message,
                                cachReceipt: orders[i].cachReceipt,
                                typeCheck: orders[i].typeCheck,
                                consultingTime: orders[i].consultingTime,
                                payType: orders[i].payType,
                                essentialCheck: orders[i].essentialCheck,
                                outage: orders[i].outage,
                                consultingType: orders[i].consultingType,
                                phoneConsulting: orders[i].phoneConsulting,
                                isComplete: orders[i].isComplete,
                                isFirst: orders[i].isFirst,
                                date: orders[i].date,
                                orderSortNum: 6,
                                addr: encryptedAddr,
                                order: {
                                    connect: { id: orders[i].id },
                                },
                                patient: {
                                    connect: { id: orders[i].patientId },
                                },
                                sendList: {
                                    connect: { id: sendListId },
                                },
                            },
                        });
                    }
                }
                // await tx.tempOrder.updateMany({
                //     where: {
                //         orderId: {
                //             in: [...combineOrderDto.orderIdArr]
                //         },
                //         isComplete: false
                //     },
                //     data: {
                //         orderSortNum: 6 //orderSortNum update!
                //     }
                // })

                //배송 주소 업데이트
                const patients = await tx.order.findMany({
                    where: {
                        id: {
                            in: combineOrderDto.orderIdArr,
                        },
                        isComplete: false,
                    },
                    select: {
                        patientId: true,
                    },
                });

                // for...of 루프를 사용하여 비동기 작업을 순차적으로 처리
                for (const e of patients) {
                    await tx.patient.update({
                        where: { id: e.patientId },
                        data: { addr: encryptedAddr },
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
     * 합배송 시 발송 목록에 있는 항목인지 체크
     */
    async isInTempOrder(orderId: number) {
        try {
            const res = await this.prisma.tempOrder.findFirst({
                where: {
                    orderId: orderId,
                },
            });

            console.log(res);

            if (res === null) {
                return { check: false, sendListId: null };
            } else {
                return { check: true, sendListId: res.sendListId };
            }
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
     * 발송 목록끼리 합배송 처리
     * @param sendCombineDto
     */
    async sendCombine(sendCombineDto: SendCombineDto) {
        try {
            // console.log(sendCombineDto);
            await this.prisma.$transaction(async (tx) => {
                const maxCombineNum = await tx.order.aggregate({
                    _max: {
                        combineNum: true,
                    },
                });
                let newCombineNum = (maxCombineNum._max.combineNum || 0) + 1;

                const orderIdArr = [];
                const tempOrderIdArr = [];
                for (let i = 0; i < sendCombineDto.idsObjArr.length; i++) {
                    orderIdArr.push(sendCombineDto.idsObjArr[i].orderId);
                    tempOrderIdArr.push(
                        sendCombineDto.idsObjArr[i].tempOrderId,
                    );
                }

                // order 테이블 combineNum 수정
                await tx.order.updateMany({
                    where: {
                        id: {
                            in: [...orderIdArr],
                        },
                    },
                    data: {
                        combineNum: newCombineNum,
                    },
                });
                // tempOrder 테이블 orderSortNum 및 sendList 수정
                await tx.tempOrder.updateMany({
                    where: {
                        id: {
                            in: [...tempOrderIdArr],
                        },
                    },
                    data: {
                        orderSortNum: 6,
                        sendListId: sendCombineDto.sendListId,
                    },
                });

                const orders = await tx.order.findMany({
                    where: {
                        id: {
                            in: [...orderIdArr],
                        },
                    },
                });

                let orderItems = 0;

                for (let i = 0; i < orders.length; i++) {
                    const orderItem = await tx.orderItem.findMany({
                        where: {
                            orderId: orders[i].id,
                            type: { in: ['common', 'yoyo'] },
                        },
                    });

                    orderItems += orderItem.length;
                }

                if (orderItems == 1) {
                    //합배송 주문 처리 되는 모든 주문을 합쳤을 때 택배비를 받아야하는 금액 처리
                    for (let i = 0; i < orders.length; i++) {
                        const orderItem = await tx.orderItem.findMany({
                            where: {
                                orderId: orders[i].id,
                                type: { in: ['common', 'yoyo'] },
                            },
                        });

                        //이럴 경우 별도 주문을 한 사람에게 택배비가 부과됩니다.
                        //따라서 별도 주문을 하지 않은 사람은 택배비를 빼줘야 합니다.
                        if (orderItem.length != 0) {
                            await tx.order.update({
                                where: { id: orders[i].id },
                                data: { price: orders[i].price - 3500 },
                            });
                        }
                    }
                } else {
                    //합배송 시 택배비를 면제해주는 금액처리
                    for (let i = 0; i < orders.length; i++) {
                        const orderItem = await tx.orderItem.findMany({
                            where: {
                                orderId: orders[i].id,
                                type: { in: ['common', 'yoyo'] },
                            },
                        });

                        if (checkSend(orderItem)) {
                            await tx.order.update({
                                where: { id: orders[i].id },
                                data: { price: orders[i].price - 3500 },
                            });
                        }
                    }
                }

                // 배송 주소 업데이트
                const encryptedAddr = this.crypto.encrypt(sendCombineDto.addr);
                const patients = await tx.order.findMany({
                    where: {
                        id: {
                            in: [...orderIdArr],
                        },
                    },
                    select: {
                        patientId: true,
                    },
                });

                for (const e of patients) {
                    await tx.patient.update({
                        where: { id: e.patientId },
                        data: { addr: encryptedAddr },
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
     * 분리발송 작업
     * @param separateDto 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async separate(separateDto: SepareteDto) {
        try {
            await this.prisma.$transaction(async (tx) => {
                //오더 정보 조회
                const orderOne = await tx.order.findUnique({
                    where: { id: separateDto.orderId },
                });

                //orderSortNum 변경
                orderOne.orderSortNum = 7;

                const orderAmount = separateDto.separate.length;

                //발송목록 id
                const sendListId = await this.insertToSendList(tx, orderAmount);

                let price = orderOne.price;
                //분리배송 용 tempOrder 생성
                for (const e of separateDto.separate) {
                    console.log(e);
                    if (e.sendTax) {
                        price += 3500;
                        await tx.order.update({
                            where: { id: separateDto.orderId },
                            data: { price: price },
                        });
                    }
                    const res = await this.createTempOrder(
                        orderOne,
                        separateDto.orderId,
                        sendListId,
                        tx,
                        e.addr,
                    );

                    if (!res.success) throw Error();
                    else {
                        await tx.tempOrderItem.create({
                            data: {
                                item: e.orderItem,
                                tempOrderId: res.id,
                                sendTax: e.sendTax,
                            },
                        });
                    }
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
     * 입금상담목록에서 주문 취소 처리
     * @param cancelOrderDto 
     * @returns 
     * Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async cancelOrder(cancelOrderDto: CancelOrderDto) {
        try {
            //초진 일 시 환자 데이터까지 soft delete
            const orderId = cancelOrderDto.orderId;
            const patientId = cancelOrderDto.patientId;

            const res = await this.prisma.$transaction(async (tx) => {
                const friendRecommend = await tx.friendRecommend.findMany({
                    where: { orderId: orderId },
                });

                if (friendRecommend.length > 0) {
                    //지인 추천 일 시 해당 데이터 아예 제거
                    await tx.friendRecommend.delete({
                        where: { id: friendRecommend[0].id },
                    });
                }
                if (cancelOrderDto.isFirst) {
                    const orderBodyType = await tx.orderBodyType.findUnique({
                        where: { orderId: orderId },
                    });

                    if (orderBodyType) {
                        //orderBodyType soft delete
                        await tx.orderBodyType.update({
                            where: { orderId: orderId },
                            data: { useFlag: false },
                        });
                    }

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
                    // orderBodyType 있는지 조회
                }
            });

            return res;
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
     * s3 데이터 오브젝트 이름 저장(나중에 삭제하기 위해서)
     * @param url
     * @param objectName
     * @returns {success:boolean}
     */
    async saveS3Data(url: string, objectName: string) {
        try {
            await this.prisma.urlData.create({
                data: {
                    url: url,
                    objectName: objectName,
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
     * outage 있는 환자 리스트 반환
     * @param getOutageListDto
     * @returns
     */
    async getOutageList(getOutageListDto: GetListDto) {
        try {
            let orderConditions = {};
            if (getOutageListDto.date !== undefined) {
                //날짜 조건 O
                const { startDate, endDate } = getDayStartAndEnd(
                    getOutageListDto.date,
                );

                orderConditions = {
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                };
            }
            let patientConditions = {};
            if (getOutageListDto.searchKeyword !== '') {
                //검색어 O
                patientConditions = {
                    patient: {
                        name: { contains: getOutageListDto.searchKeyword },
                    },
                };
            }
            const list = await this.prisma.order.findMany({
                where: {
                    outage: {
                        not: '',
                    },
                    ...orderConditions,
                    ...patientConditions,
                    consultingType: false,
                    // isComplete: false,
                },
                select: {
                    id: true,
                    route: true,
                    message: true,
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
                    isPickup: true,
                    price: true,
                    card: true,
                    cash: true,
                    note: true,
                    addr: true,
                    reviewFlag: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        },
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        },
                    },
                    tempOrders: {
                        select: {
                            sendList: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                        },
                    },
                },
            });

            const sortedList = sortItems(list);

            for (let row of sortedList) {
                console.log(row);
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                // const decryptedAddr = this.crypto.decrypt(row.addr);
                row.patient.phoneNum = decryptedPhoneNum;
                // row.addr = decryptedAddr;
            }

            const outageList = getOutage(sortedList);

            outageList.sort((a, b) => {
                const aId =
                    a.tempOrders.length > 0
                        ? a.tempOrders[0].sendList.id
                        : Number.MAX_SAFE_INTEGER;
                const bId =
                    b.tempOrders.length > 0
                        ? b.tempOrders[0].sendList.id
                        : Number.MAX_SAFE_INTEGER;
                return aId - bId;
            });
            return { success: true, list: outageList };
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

    async getOutageCount(getDateDto: GetDateDto) {
        try {
            let orderConditions = {};
            if (getDateDto.date !== undefined) {
                //날짜 조건 O
                const date = new Date(getDateDto.date);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const { firstDay, lastDay } = getFirstAndLastDayOfMonth(
                    year,
                    month,
                );

                orderConditions = {
                    date: {
                        gte: firstDay,
                        lt: lastDay,
                    },
                };
            }

            const list = await this.prisma.order.findMany({
                where: {
                    outage: {
                        not: '',
                    },
                    ...orderConditions,
                    consultingType: false,
                    reviewFlag: true,
                    // isComplete: false,
                },
                select: {
                    id: true,
                },
            });

            let len = list.length;

            return { success: true, status: HttpStatus.OK, len };
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

    async getCanceledOrderList(getListDto: GetListDto) {
        try {
            let orderConditions = {};
            if (getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    useFlag: false,
                    isComplete: false,
                };
            } else {
                //날짜 조건 O
                const { startDate, endDate } = getDayStartAndEnd(
                    getListDto.date,
                );

                orderConditions = {
                    useFlag: false,
                    isComplete: false,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                };
            }
            let patientConditions = {};
            if (getListDto.searchKeyword !== '') {
                //검색어 O
                patientConditions = {
                    patient: { name: { contains: getListDto.searchKeyword } },
                };
            }
            const list = await this.prisma.order.findMany({
                where: {
                    ...orderConditions,
                    ...patientConditions,
                    orderSortNum: { gte: 0 },
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
                    consultingFlag: true,
                    consultingType: true,
                    phoneConsulting: true,
                    isFirst: true,
                    date: true,
                    orderSortNum: true,
                    remark: true,
                    isPickup: true,
                    price: true,
                    card: true,
                    cash: true,
                    addr: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        },
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        },
                    },
                },
            });

            const sortedList = sortItems(list);

            for (let row of sortedList) {
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                const decryptedPatientAddr = this.crypto.decrypt(
                    row.patient.addr,
                );
                row.patient.phoneNum = decryptedPhoneNum;
                row.patient.addr = decryptedPatientAddr;
                if (row.addr !== '') {
                    const decryptedAddr = this.crypto.decrypt(row.addr);
                    row.addr = decryptedAddr;
                }
            }

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

    async restoreCanceledOrder(restoreOrderDto: CancelOrderDto) {
        console.log(restoreOrderDto);
        const date = new Date();
        const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        console.log(kstDate);

        if (restoreOrderDto.isFirst) {
            //초진일 시 다른 데이터까지 복구
            const orderId = restoreOrderDto.orderId;
            const patientId = restoreOrderDto.patientId;

            await this.prisma.$transaction(async (tx) => {
                await tx.orderBodyType.update({
                    where: { orderId: orderId },
                    data: { useFlag: true },
                });

                await tx.orderItem.updateMany({
                    where: { orderId: orderId },
                    data: { useFlag: true },
                });

                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        useFlag: true,
                        date: kstDate,
                    },
                });

                await tx.patient.update({
                    where: { id: patientId },
                    data: { useFlag: true },
                });
            });

            return { success: true, status: HttpStatus.OK, msg: '초진 복구' };
        } else {
            //재진일 시 오더 정보만 복구
            const orderId = restoreOrderDto.orderId;

            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    useFlag: true,
                    date: kstDate,
                },
            });

            return { success: true, status: HttpStatus.OK, msg: '재진 복구' };
        }
    }

    async updateAddr() {
        const res = await this.prisma.patient.findMany({
            select: { id: true, addr: true },
        });

        for (let i = 0; i < res.length; i++) {
            await this.prisma.order.updateMany({
                where: { patientId: res[i].id },
                data: { addr: res[i].addr },
            });
        }
    }

    /**
     * 원내에서 새 오더 생성
     * @param newOrderDto
     * @returns
     */
    async newOrder(newOrderDto: NewOrderDto) {
        try {
            const encryptedAddr = this.crypto.encrypt(newOrderDto.addr);
            const encryptedPhoneNum = this.crypto.encrypt(newOrderDto.phoneNum);
            const encryptedSocialNum = this.crypto.encrypt(
                newOrderDto.socialNum,
            );

            const date = new Date(newOrderDto.date);
            const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

            if (newOrderDto.isFirst) {
                //초진일 시
                await this.prisma.$transaction(async (tx) => {
                    const newPatient = await tx.patient.create({
                        data: {
                            name: newOrderDto.name,
                            phoneNum: encryptedPhoneNum,
                            addr: encryptedAddr,
                            socialNum: encryptedSocialNum,
                            useFlag: true,
                        },
                    });

                    await tx.order.create({
                        data: {
                            route: '',
                            message: '',
                            cachReceipt: '',
                            typeCheck: '',
                            consultingTime: '',
                            payType: newOrderDto.payType,
                            essentialCheck: '',
                            outage: '',
                            isFirst: newOrderDto.isFirst,
                            price: 0,
                            patientId: newPatient.id,
                            date: kstDate,
                            orderSortNum: 1, //구수방인지 체크
                            addr: encryptedAddr,
                        },
                    });
                });
            } else {
                //재진일 시
                await this.prisma.$transaction(async (tx) => {
                    const exPatient = await tx.patient.findMany({
                        where: {
                            name: newOrderDto.name,
                            socialNum: encryptedSocialNum,
                        },
                    });

                    if (!exPatient) {
                        throw new HttpException(
                            {
                                success: false,
                                status: HttpStatus.NOT_FOUND,
                            },
                            HttpStatus.NOT_FOUND,
                        );
                    } else if (exPatient.length > 1) {
                        throw new HttpException(
                            {
                                success: false,
                                status: HttpStatus.CONFLICT,
                            },
                            HttpStatus.CONFLICT,
                        );
                    }

                    await tx.patient.update({
                        where: {
                            id: exPatient[0].id,
                        },
                        data: {
                            name: newOrderDto.name,
                            phoneNum: encryptedPhoneNum,
                            addr: encryptedAddr,
                            socialNum: encryptedSocialNum,
                            useFlag: true,
                        },
                    });

                    await tx.order.create({
                        data: {
                            route: '',
                            message: '',
                            cachReceipt: '',
                            typeCheck: '',
                            consultingTime: '',
                            payType: newOrderDto.payType,
                            essentialCheck: '',
                            outage: '',
                            isFirst: newOrderDto.isFirst,
                            price: 0,
                            patientId: exPatient[0].id,
                            date: kstDate,
                            orderSortNum: 1, //구수방인지 체크
                            addr: encryptedAddr,
                        },
                    });
                });
            }

            return { success: true, status: HttpStatus.CREATED };
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
     * 지인 추천 체크
     * @param name
     * @param phoneNum
     * @returns
     */
    async checkRecommend(name: string, phoneNum: string) {
        try {
            const res = await this.prisma.patient.findMany({
                where: { name: name, useFlag: true },
            });

            let flag = false;
            let id = 0;
            for (const e of res) {
                const checkPhoneNum = this.crypto.decrypt(e.phoneNum);

                if (
                    e.name.replaceAll(' ', '') === name &&
                    checkPhoneNum.includes(phoneNum)
                ) {
                    flag = true;
                    id = e.id;
                    break;
                }
            }

            return { success: flag, patientId: id };
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
     * 지인 확인 할인 여부 체크
     * @param checkDiscountDto
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async checkDiscount(checkDiscountDto: CheckDiscountDto) {
        try {
            const check = await this.checkRecommend(
                checkDiscountDto.name,
                checkDiscountDto.phoneNum,
            );

            //기존에 이 추천인으로 할인 받은 내역 있나 체크
            const existRecommendCheck =
                await this.prisma.friendRecommend.findMany({
                    where: { patientId: check.patientId },
                    select: { order: true },
                });

            let existRecommendCheckFlag = true;

            for (const e of existRecommendCheck) {
                if (e.order.patientId == checkDiscountDto.patientId) {
                    existRecommendCheckFlag = false;
                }
            }

            if (!existRecommendCheckFlag) {
                return {
                    success: false,
                    status: HttpStatus.CONFLICT,
                    msg: '이미 추천 받은 적 있는 지인입니다',
                };
            }

            if (check.success) {
                await this.prisma.$transaction(async (tx) => {
                    await tx.friendRecommend.create({
                        data: {
                            orderId: checkDiscountDto.orderId,
                            patientId: check.patientId,
                            checkFlag: true,
                            date: checkDiscountDto.date,
                            name: checkDiscountDto.name,
                            phoneNum: checkDiscountDto.phoneNum,
                        },
                    });

                    const order = await tx.order.findUnique({
                        where: { id: checkDiscountDto.orderId },
                        select: { remark: true },
                    });

                    let remark =
                        '지인 10포' +
                        (order.remark == null || order.remark == ''
                            ? ''
                            : `/${order.remark}`);
                    console.log('//////////////////////////////');
                    console.log(remark);

                    await tx.order.update({
                        where: { id: checkDiscountDto.orderId },
                        data: {
                            orderSortNum: 4,
                            remark: remark,
                            routeFlag: false,
                            consultingFlag: true,
                        },
                    });
                });
                return {
                    success: true,
                    status: HttpStatus.CREATED,
                    msg: '지인처리가 완료 되었습니다',
                };
            } else {
                return {
                    success: false,
                    status: HttpStatus.NOT_FOUND,
                    msg: '등록하신 환자 데이터를 찾을 수 없습니다',
                };
            }
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
     * 지인 할인 취소
     * @param id
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async cancelDiscount(id: number) {
        try {
            const exOrder = await this.prisma.order.findUnique({
                where: { id: id },
                select: {
                    friendDiscount: true,
                    patient: {
                        select: {
                            id: true,
                        },
                    },
                    price: true,
                    remark: true,
                },
            });

            if (!exOrder.friendDiscount)
                return {
                    success: false,
                    status: HttpStatus.NOT_FOUND,
                    msg: '해당 주문은 할인 대상이 아닙니다',
                };

            await this.prisma.$transaction(async (tx) => {
                let price = exOrder.price;
                price = (price / 9) * 10; //가격 원래대로
                let newRemark = exOrder.remark.replace('지인 10% 할인/', '');

                await tx.order.update({
                    where: { id: id },
                    data: {
                        price: price,
                        friendDiscount: false,
                        remark: newRemark,
                    },
                });

                await tx.friendRecommend.updateMany({
                    where: { patientId: exOrder.patient.id },
                    data: { useFlag: true },
                });
            });

            return { success: true, status: HttpStatus.CREATED, msg: '완료' };
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
     * 후기 대상 목록에서 비고 수정
     * @param updateNoteDto
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async updateNote(updateNoteDto: UpdateNoteDto) {
        try {
            await this.prisma.order.update({
                where: { id: updateNoteDto.orderId },
                data: {
                    note: updateNoteDto.note,
                    reviewFlag: true,
                },
            });

            return { success: true, status: HttpStatus.CREATED, msg: '완료' };
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
     * 후기 대상 목록에서 후기 유무 체크
     * @param id
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async updateReviewFlag(id: number) {
        try {
            const tempData = await this.prisma.$queryRaw`
                select 
                    reviewFlag 
                from \`order\` 
                where id = ${id}
            `;
            let flag = false;
            if (tempData[0].reviewFlag != true) {
                flag = true;
            }

            await this.prisma.order.update({
                where: { id: id },
                data: { reviewFlag: flag },
            });

            return { success: true, status: HttpStatus.CREATED, msg: '완료' };
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
     * 후기 대상 목록에서 새 후기 대상 생성
     * @param createNewReviewDto
     * @returns {success:boolean, status: HttpStatus, msg: string}
     */
    async createNewReview(createNewReviewDto: CreateNewReviewDto) {
        try {
            const patient = await this.prisma.patient.findMany({
                where: {
                    name: createNewReviewDto.name,
                },
            });

            let patientData = null;

            for (const e of patient) {
                const checkPhoneNum = this.crypto.decrypt(e.phoneNum);
                const checkSocialNum = this.crypto.decrypt(e.socialNum);

                if (
                    checkPhoneNum.includes(createNewReviewDto.phoneNum) &&
                    checkSocialNum.includes(createNewReviewDto.socialNum)
                ) {
                    patientData = e;
                    break;
                }
            }

            if (patient == null) {
                throw new HttpException(
                    {
                        success: false,
                        status: HttpStatus.NOT_FOUND,
                        msg: '환자 데이터를 찾을 수 없습니다.',
                    },
                    HttpStatus.NOT_FOUND,
                );
            }

            const date = new Date(createNewReviewDto.date);
            // 한국 시간으로 변환
            const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

            await this.prisma.order.create({
                data: {
                    useFlag: false,
                    route: '',
                    message: '',
                    cachReceipt: '',
                    typeCheck: '',
                    consultingTime: '',
                    payType: '',
                    essentialCheck: '',
                    outage: '후기대상목록에서 생성',
                    consultingType: false,
                    phoneConsulting: false,
                    isComplete: false,
                    patientId: patientData.id,
                    isFirst: false,
                    date: kstDate,
                    orderSortNum: 1,
                    note: createNewReviewDto.note,
                    addr: '',
                },
            });

            return { success: true, status: HttpStatus.CREATED, msg: '완료' };
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

    //이것도 리팩토링 안하면 절 죽이세요
    async fixSendList(id: number, tx: any) {
        try {
            // await this.prisma.$transaction(async (tx) => {
            await tx.sendList.update({
                where: {
                    id: id,
                },
                data: {
                    fixFlag: true,
                },
            });

            await this.fixSortNum(id, tx);

            //});
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

    async fixSortNum(id: number, tx: any) {
        try {
            const sendData = await this.getOrderTempList(id, tx);

            const list = sendData.list; //발송목록 tempOrder list;

            console.log(list);
            // for(let i = 0; i<list.length; i++) {
            //     console.log(list[i]);
            //     await tx.tempOrder.update({
            //         where:{id:list[i].id},
            //         data:{sortFixNum:i+1}
            //     });
            // }

            const qryArr = list.map(async (e, i) => {
                return tx.tempOrder.update({
                    where: { id: e.id },
                    data: { sortFixNum: i + 1 },
                });
            });

            await Promise.all([...qryArr])
                .then((value) => {
                    return { success: true, status: HttpStatus.CREATED };
                })
                .catch((err) => {
                    this.logger.error(err);
                    throw new HttpException(
                        {
                            success: false,
                            status: HttpStatus.INTERNAL_SERVER_ERROR,
                        },
                        HttpStatus.INTERNAL_SERVER_ERROR,
                    );
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

    /** 이거 제가 까먹고 리팩토링 안하면 절 죽이세요
     * 고정 안 된 발송목록(tempOrder)에서 가져오기
     * @returns
     */
    async getOrderTempList(id: number, tx) {
        try {
            console.log('this list is not fixed');
            const list = await tx.tempOrder.findMany({
                where: {
                    sendListId: id,
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum: 'asc', //sortNum으로 order by 해야됨
                },
                select: {
                    id: true,
                    outage: true,
                    date: true,
                    isFirst: true,
                    orderSortNum: true,
                    sendNum: true,
                    payType: true,
                    addr: true,
                    updateInfoCheck: true,
                    cancelFlag: true,
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
                            remark: true,
                            cachReceipt: true,
                            price: true,
                            cash: true,
                            card: true,
                            orderSortNum: true,
                            combineNum: true,
                            payFlag: true,
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
                            id: true,
                            item: true,
                            sendTax: true,
                        },
                    },
                },
            });

            const sortItemsList = sortItems(list, true);

            const sortedList = getSortedList(sortItemsList);

            for (let row of sortedList) {
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPhoneNum = this.crypto.decrypt(
                    row.patient.phoneNum,
                );
                row.addr = decryptedAddr;
                row.patient.phoneNum = decryptedPhoneNum;
            }

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
     * 입금상담목록에서 지인 확인 체크 안된 거 색칠 처리
     * @param routeFlagDto
     * @returns {success:boolean, status:HttpStatus}
     */
    async updateRouteFlag(routeFlagDto: RouteFlagDto) {
        try {
            await this.prisma.order.update({
                where: { id: routeFlagDto.id },
                data: { routeFlag: !routeFlagDto.routeFlag },
            });

            return { success: true, status: HttpStatus.CREATED };
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
     * 지인 10포 취소
     * @param friendRecommendId
     * @returns {success:boolean,status:HttpStatus}
     */
    async cancelFriendRecommend(cancelRecommendDto: CancelFriendDto) {
        try {
            let dataCondition: { orderSortNum: number; remark?: string } = {
                orderSortNum: cancelRecommendDto.orderSortNum,
            };
            console.log(cancelRecommendDto.detail);
            if (cancelRecommendDto.detail !== undefined) {
                dataCondition = {
                    ...dataCondition,
                    remark: cancelRecommendDto.detail,
                };
            }

            await this.prisma.$transaction(async (tx) => {
                await tx.friendRecommend.delete({
                    where: { id: cancelRecommendDto.friendRecommendId },
                });

                await tx.order.update({
                    where: { id: cancelRecommendDto.orderId },
                    data: { ...dataCondition },
                });
            });

            return { success: true, status: HttpStatus.CREATED };
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
     * 휴일, 주말, 수요일 아닌 날짜 title 형식('2025/2/6')으로 반환
     * @param tx
     * @param date
     * @returns
     */
    async checkIsHoliday(tx, date: Date) {
        const holidays = await tx.holiday.findMany({
            where: {
                date: {
                    gt: new Date(),
                },
                useFlag: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        let nextDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        while (true) {
            // console.log('nextDate', nextDate);
            const dayOfWeek = nextDate.getDay();
            // console.log('dayOfWeek', dayOfWeek);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isWednesDay = dayOfWeek === 3;

            const isHoliday = holidays.some((holiday) => {
                return (
                    new Date(holiday.date).toISOString().split('T')[0] ===
                    nextDate.toISOString().split('T')[0]
                );
            });

            // 주말, 휴일, 수요일 아니면 반환
            if (!isWeekend && !isHoliday && !isWednesDay) {
                break;
            }

            nextDate.setDate(nextDate.getDate() + 1);
        }

        return `${nextDate.getFullYear()}/${nextDate.getMonth() + 1}/${nextDate.getDate()}`;
    }
}
