import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Excel from 'exceljs'
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
import { GetOrderSendPrice } from 'src/util/getOrderPrice';
import { CompleteSetSendDto } from './Dto/completeSetSend.dto';
import { GetHyphen } from 'src/util/hyphen';
import { CombineOrderDto } from './Dto/combineOrder.dto';
import { SepareteDto } from './Dto/separteData.dto';
import { sortItems } from 'src/util/sortItems';
import { getKstDate } from 'src/util/getKstDate';
import { CancelOrderDto } from './Dto/cancelOrder.dto';
import { contains } from 'class-validator';
import { Crypto } from 'src/util/crypto.util';
const Prisma = require('@prisma/client').Prisma;

@Injectable()
export class ErpService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private adminService: AdminService,
        private crypto: Crypto,
    ) { }

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
                payType: ''
            };//오더 정보
            const objOrderBodyType: any = {}; //초진 시 건강 응답 정보
            const objOrderItem: any = [] //오더 아이템 정보

            insertOrder.forEach(e => {
                //console.log(e)
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    if (e.answer != '') {
                        const obj = {
                            item: e.answer,
                            type: e.code
                        }
                        objOrderItem.push(obj);
                    }
                } else if (e.orderType == 'orderBodyType') {
                    objOrderBodyType[`${e.code}`] = e.answer;
                } else {
                    throw error('400 error');
                }
            });

            //기존 환자가 있는지 체크
            const existPatient = await this.existPatientCheck(objPatient.name,objPatient.socialNum);
            console.log(existPatient+ ' 기존환자 체크');
            if(!existPatient.success){
                //있으면 재진으로 접수 처리
                return {success:false, status:HttpStatus.CONFLICT, msg:'이미 접수하신 이력이 있습니다. 재진접수를 이용해주세요'}
            }

            // //처리되는 주문이 있는지 확인
            // const existOrder = await this.existOrderCheck(objPatient.name,objPatient.socialNum);

            // if(!existOrder){
            //     return {success:false, status:HttpStatus.CONFLICT, msg:'이미 접수된 주문이 있습니다. 수정을 원하시면 주문 수정을 해주세요'};
            // }

            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(objOrderItem, itemList);
            const price = getOrderPrice.getPrice();
            console.log(price);
            console.log('=====================');

            console.log(objOrder);
            console.log(objPatient);
            console.log(objOrderBodyType);
            console.log(objOrderItem);

            const encryptedPhoneNum = this.crypto.encrypt(objPatient.phoneNum);
            const encryptedAddr = this.crypto.encrypt(objPatient.addr);
            const encryptedSocialNum = this.crypto.encrypt(objPatient.socialNum);

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.create({
                    data: {
                        name: objPatient.name,
                        phoneNum: encryptedPhoneNum,
                        addr: encryptedAddr,
                        socialNum: encryptedSocialNum
                    }
                });
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
                        orderSortNum: checkGSB(objOrder.route) ? 4 : 0,
                        addr: encryptedAddr
                    }
                });

                const orderBodyType = await tx.orderBodyType.create({
                    data: {
                        tallWeight: objOrderBodyType.tallWeight,
                        digestion: objOrderBodyType.digestion.join('/'),
                        sleep: objOrderBodyType.sleep.join('/'),
                        constipation: objOrderBodyType.constipation.join('/'),
                        nowDrug: objOrderBodyType.nowDrug.join('/'),
                        pastDrug: objOrderBodyType.pastDrug.join('/'),
                        pastSurgery: objOrderBodyType.pastSurgery.join('/'),
                        orderId: order.id,
                    }
                });

                console.log(objOrderItem);
                console.log('--------------------');

                const items = objOrderItem.map((item) => ({
                    item: item.item,
                    type: item.type,
                    orderId: order.id
                }));

                console.log(items);

                const orderItem = await tx.orderItem.createMany({
                    data: items
                });
            });

            return { success: true, status: HttpStatus.CREATED };

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
     * 초진용 기존 환자 있는지 확인 여부
     * @param name 
     * @param socialNum 
     * @returns {success:boolean}
     */
    async existPatientCheck(name: string, socialNum: string) {
        try{
            console.log(name);
            console.log(socialNum);
            const res = await this.prisma.patient.findMany({
                where: { name } //설마 이름도 같고 생년월일에 성도 같은 사람이 존재 하겠어?
                },
               
            );
            console.log(res);

            let check = true;

            for(const e of res) {
                const checkSocialNum = this.crypto.decrypt(e.socialNum);
                if(checkSocialNum === socialNum) {
                    check = false;
                    break;
                }
            }

            console.log("check", check);
            return { success: check };

            
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
            let orderConditions = {};
            if (getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    consultingType: false,
                    isComplete: false,
                }
            } else {
                //날짜 조건 O
                const { startDate, endDate } = getKstDate(getListDto.date);

                orderConditions = {
                    consultingType: false,
                    isComplete: false,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    }
                }
            }
            let patientConditions = {};
            if (getListDto.searchKeyword !== "") {
                //검색어 O
                if (getListDto.searchCategory === "all") {
                    patientConditions = {
                        OR: [
                            { patient: { name: { contains: getListDto.searchKeyword } } },
                            { patient: { phoneNum: { contains: getListDto.searchKeyword } } },
                        ]
                    }
                }
                else if (getListDto.searchCategory === "name") {
                    patientConditions = {
                        patient: { name: { contains: getListDto.searchKeyword } }
                    }
                }
                else if (getListDto.searchCategory === "num") {
                    patientConditions = {
                        patient: { phoneNum: { contains: getListDto.searchKeyword } }
                    }
                }
            }
            const list = await this.prisma.order.findMany({
                where: { ...orderConditions, ...patientConditions, orderSortNum: { gte: 0 } },
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

            const sortedList = sortItems(list);

            // 나중에 DB 데이터 암호화되면 여기 활성화
            // for (let row of sortedList) {
            //     const decryptedPhoneNume = this.crypto.decrypt(row.patient.phoneNum);
            //     const decryptedAddr = this.crypto.decrypt(row.addr);
            //     row.patient.phoneNum = decryptedPhoneNume;
            //     row.addr = decryptedAddr;
            // }

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
                phoneNum: ''
            };
            const objOrder: any = {};
            const objOrderBodyType: any = {};
            const objOrderItem: any = [];

            insertOrder.forEach(e => {
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    console.log(e);
                    const obj = {
                        item: e.answer,
                        type: e.code
                    }
                    objOrderItem.push(obj);
                } else if (e.orderType == 'orderBodyType') {
                    objOrderBodyType[`${e.code}`] = e.answer;
                } else {
                    throw error('400 error');
                }
            });

         
            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(objOrderItem, itemList);
            const price = getOrderPrice.getPrice();
            console.log(price);
            console.log('=====================');

            const patient = await this.checkPatient(objPatient);

            console.log("this is patientttttttttttttttttttttttt");
            console.log(patient);
            if (!patient.success) return {
                success: false,
                status: HttpStatus.NOT_FOUND,
                msg: '환자 정보가 없습니다. 입력 내역을 확인하거나 처음 접수시라면 초진 접수로 이동해주세요'
            };

             //처리되는 주문이 있는지 확인
             const existOrder = await this.existOrderCheck(objPatient.name,objPatient.socialNum);

             if(!existOrder){
                 return {success:false, status:HttpStatus.CONFLICT, msg:'이미 접수된 주문이 있습니다. 수정을 원하시면 주문 수정을 해주세요'};
             }

             const encryptedAddr = this.crypto.encrypt(objPatient.addr);
             const encryptedPhoneNum = this.crypto.encrypt(objPatient.phoneNum);

            await this.prisma.$transaction(async (tx) => {
                await tx.patient.update({
                    where: {
                        id: patient.patient.id,
                    },
                    data: {
                        addr: encryptedAddr,
                        phoneNum: encryptedPhoneNum,
                    }
                });


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
                        orderSortNum: checkGSB(objOrder.route) ? 4 : 0,
                        addr: encryptedAddr,
                    }
                });

                console.log(objOrderItem);
                console.log('--------------------');
                const items = [];

                for (let i = 0; i < objOrderItem.length; i++) {
                    let tempObj = objOrderItem[i];
                    let temp = {}

                    if (tempObj.type == 'assistant' && tempObj.item !== "") {
                        temp = {
                            item: tempObj.item,
                            type: tempObj.type,
                            orderId: order.id
                        }
                        //console.log(temp);
                        items.push(temp);

                    } else {
                        for (let j = 0; j < tempObj.item.length; j++) {
                            temp = {
                                item: tempObj.item[j],
                                type: tempObj.type,
                                orderId: order.id
                            }

                            //console.log(temp);

                            items.push(temp);
                        }
                    }

                }

                console.log(items);

                const orderItem = await tx.orderItem.createMany({
                    data: items
                });
            });

            return { success: true, status: HttpStatus.CREATED };
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
     * 진행되고 있는 주문이 있는지 여부 확인
     * @param name 
     * @param socialNum 
     * @returns boolean
     */
    async existOrderCheck(name:string, socialNum:string){
        try{
            console.log(name);
            console.log(socialNum);
            const res = await this.prisma.order.findMany({
                where: {
                    patient: {
                        name: name,
                    },
                    isComplete: false,
                },
                include: {
                    patient: true,
                }
            });

            console.log(res);

            let check = true;

            for(const e of res) {
                const checkSocialNum = this.crypto.decrypt(e.patient.socialNum);
                if(checkSocialNum.includes(socialNum)){
                    check = false;
                    break;
                }
            }

            return check;
        }catch (err) {
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
     * 오더 수정하기
     * @param surveyDto 
     * @param header 
     * @param orderId 
     * @returns { success: true, status: number }
     */
    async updateOrder(surveyDto: SurveyDto, header: string, orderId: number) {
        try {
            const token = await this.jwtService.decode(header);

            //토큰에 데이터가 아예 없을 때
            if (!token.orderId) {
                return { success: false, status: HttpStatus.FORBIDDEN };
            }
            console.log(typeof token.orderId);
            //토큰 정보와 오더 정보가 다를 때
            if (token.orderId != orderId) return { success: false, status: HttpStatus.FORBIDDEN };

            const insertOrder = surveyDto.answers;
            const date = surveyDto.date;

            const objPatient: any = {}; //환자 정보
            const objOrder: OrderObjDto = {
                route: '',
                message: '',
                cachReceipt: '',
                typeCheck: '',
                consultingTime: '',
                payType: ''
            };//오더 정보
            const objOrderBodyType: any = {}; //초진 시 건강 응답 정보
            const objOrderItem: any = [] //오더 아이템 정보

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
                } else if (e.orderType == 'orderBodyType') {
                    objOrderBodyType[`${e.code}`] = e.answer;
                } else {
                    throw error('400 error');
                }
            });

            const encryptedAddr = this.crypto.encrypt(objPatient.addr);

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.update({
                    where: {
                        id: token.patientId
                    },
                    data: {
                        addr: encryptedAddr
                    }
                });

                const order = await tx.order.update({
                    where: {
                        id: token.orderId
                    },
                    data: {
                        payType: objOrder.payType
                    }
                });

                await tx.orderItem.deleteMany({
                    where: {
                        orderId: token.orderId
                    }
                });

                const items = objOrderItem.map((item) => ({
                    item: item.item,
                    type: item.type,
                    orderId: order.id
                }));

                console.log(items);

                const orderItem = await tx.orderItem.createMany({
                    data: items
                });
            });

            return { success: true, status: HttpStatus.CREATED };

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
                }
            });

            console.log(res);

            let check = false;
            let matched: any = {};

            for(const e of res) {
                const checkSocialNum = this.crypto.decrypt(e.socialNum);
                if(checkSocialNum.includes(objPatient.socialNum)) {
                    matched = { ...e };
                    check = true;
                }
            }

            if (res.length === 0) return { success: check };
            else return { success: check, patient: matched };
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
     * 유선 상담 목록으로 이동
     * @param callConsultingDto 
     * @returns {success:boolean,status:number}
     */
    async callConsulting(callConsultingDto: CallConsultingDto) {
        try {
            await this.prisma.order.update({
                where: {
                    id: callConsultingDto.orderId,
                    patientId: callConsultingDto.userId
                },
                data: {
                    consultingType: true,
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
     * 유선 상담 목록 조회
     * @returns 
     */
    async getCallList(header: string, getListDto: GetListDto) {
        try {
            console.log(getListDto);
            //등급 조회
            const checkAdmin = await this.adminService.checkAdmin(header);
            if (!checkAdmin.success) return { success: false, status: HttpStatus.FORBIDDEN, msg: '권한이 없습니다' };

            let orderConditions = {};
            if (getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    consultingType: true,
                    isComplete: false,
                }
            } else {
                const {startDate,endDate} = getKstDate(getListDto.date);
                orderConditions = {
                    consultingType: true,
                    isComplete: false,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    }
                }
            }
            let patientConditions = {};
            if (getListDto.searchKeyword === "") {
                //검색어 O
                if (getListDto.searchCategory === "all") {
                    patientConditions = {
                        OR: [
                            { patient: { name: { contains: getListDto.searchKeyword } } },
                            { patient: { phoneNum: { contains: getListDto.searchKeyword } } },
                        ]
                    }
                }
                else if (getListDto.searchCategory === "name") {
                    patientConditions = {
                        patient: { name: { contains: getListDto.searchKeyword } }
                    }
                }
                else if (getListDto.searchCategory === "num") {
                    patientConditions = {
                        patient: { name: { contains: getListDto.searchKeyword } }
                    }
                }
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
                    remark: true,
                    isPickup: true,
                    price: true,
                    addr:true,
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
                    orderBodyType: {
                        select: {
                            tallWeight: true,
                            digestion: true,
                            sleep: true,
                            constipation: true,
                            nowDrug: true,
                            pastDrug: true,
                            pastSurgery: true,
                        }
                    }
                }
            });

            const sortedList = sortItems(list);

            // 나중에 DB 데이터 암호화되면 여기 활성화
            // for (let row of sortedList) {
            //     const decryptedPhoneNume = this.crypto.decrypt(row.patient.phoneNum);
            //     const decryptedAddr = this.crypto.decrypt(row.addr);
            //     row.patient.phoneNum = decryptedPhoneNume;
            //     row.addr = decryptedAddr;
            // }

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
     * 유선 상담 완료 처리
     * @param callConsultingDto 
     * @returns {success:boolean,status:number}
     */
    async callComplete(callConsultingDto: CallConsultingDto, header: string) {
        try {
            const checkAdmin = await this.adminService.checkAdmin(header);
            if (!checkAdmin.success) return { success: false, status: HttpStatus.FORBIDDEN }; //일반 유저 거르기

            //유선 상담 완료 처리
            await this.prisma.order.update({
                where: {
                    id: callConsultingDto.orderId,
                    patientId: callConsultingDto.userId
                },
                data: {
                    consultingType: false,
                    phoneConsulting: true,
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
     * 총 금액과 card, cash 결제액 합이 일치하는지
     */
    async checkPaymentAmount(id: number) {
        try {
            const { price, card, cash } = await this.prisma.order.findUnique({
                where: {
                    id: id
                },
                select: {
                    price: true,
                    card: true,
                    cash: true,
                }
            });
            if (price !== card + cash) {
                return { success: false };
            }
            return { success: true };
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
     * 발송 목록으로 이동 처리(상담 완료 처리)
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async completeConsulting(id: number) {
        try {
            const paymentAmountCheck = await this.checkPaymentAmount(id);
            if (!paymentAmountCheck.success) {
                throw new HttpException(
                    {
                        status: HttpStatus.UNPROCESSABLE_ENTITY,
                        error: "금액과 결제액 불일치"
                    },
                    HttpStatus.UNPROCESSABLE_ENTITY
                )
            } else {
                //트랜젝션 시작
                await this.prisma.$transaction(async (tx) => {

                    //발송 목록으로 이동 처리
                    const sendOne = await tx.order.update({
                        where: {
                            id: id
                        },
                        data: {
                            isComplete: true,
                        }
                    });

                    //해당 오더 발송 개수 가져오기
                    const orderItems = await tx.orderItem.findMany({
                        where: {
                            orderId: id,
                            type: { in: ['common', 'yoyo'] }
                        }
                    });

                    console.log(`-----------${orderItems.length}-----------`);
                    console.log(orderItems);

                    //오더 개수
                    const orderAmount = orderItems.length;

                    const sendListId = await this.insertToSendList(tx, orderAmount);

                    const res = await this.createTempOrder(sendOne, id, sendListId, tx);

                    if (!res.success) throw error();

                });

                return { success: true, status: HttpStatus.OK };
            }
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                err.status || HttpStatus.INTERNAL_SERVER_ERROR
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
                    fixFlag: false //픽스 여부 체크
                },
                orderBy: {
                    id: 'asc'
                },
                select: {
                    id: true,
                    amount: true,
                    title: true,
                }
            });

            console.log(sendList.length);

            //아직 350개 차지 않은 발송 목록이 있을 때
            if (sendList.length > 0) {
                const checkAmount = sendList[0].amount + orderAmount; //기존 발송목록과 추가되는 오더의 개수 더한거

                if (checkAmount > 350) {
                    //350개가 넘으면 새로운 발송목록에 삽입
                    if (sendList.length == 1) {
                        //새로 삽입할 발송목록이 없어 새로 만들어야 될 때
                        const sendList = await tx.sendList.findMany({
                            orderBy: {
                                id: 'asc'
                            },
                            select: {
                                id: true,
                                amount: true,
                                title: true,
                            }
                        }); //제일 마지막 발송일자 가져오기
                        const lastTitle = sendList[sendList.length - 1].title;
                        const date = new Date(lastTitle) > new Date() ? new Date(lastTitle) : new Date();
                        const title = getSendTitle(date);
                        console.log(title);

                        const newSendList = await tx.sendList.create({
                            data: {
                                title: title,
                                amount: orderAmount,
                                date: date,
                                full: false
                            }
                        });

                        return newSendList.id;

                    } else {
                        //다 차지 않은 발송목록이 있어서 그냥 넣으면 될 때
                        await tx.sendList.update({
                            where: {
                                id: sendList[1].id
                            },
                            data: {
                                amount: checkAmount
                            }
                        });
                        return sendList[1].id
                    }
                } else {
                    //350개 이하면 기존 발송목록에 삽입
                    const checkAmount = sendList[0].amount + orderAmount;

                    if (checkAmount == 350) {
                        await tx.sendList.update({
                            where: {
                                id: sendList[0].id
                            },
                            data: {
                                full: true,
                                fixFlag: true, //350개 되면 자동으로 fix
                            }
                        });
                    } else {
                        await tx.sendList.update({
                            where: {
                                id: sendList[0].id
                            },
                            data: {
                                amount: checkAmount
                            }
                        })
                    }

                    return sendList[0].id

                }
            } else {
                //새로 발송목록을 만들어야 할 때
                console.log('create new send list');
                const sendList = await tx.sendList.findMany({
                    orderBy: {
                        id: 'asc'
                    },
                    select: {
                        id: true,
                        amount: true,
                        title: true,
                    }
                });//제일 마지막 발송일자 가져오기
                console.log(sendList);

                const lastTitle = sendList.length != 0 ? sendList[sendList.length - 1].title : new Date();
                const date = new Date(lastTitle) > new Date() ? new Date(lastTitle) : new Date();
                console.log(date);
                const title = getSendTitle(date);
                //console.log(title);
                const newSendList = await tx.sendList.create({
                    data: {
                        title: title,
                        amount: orderAmount,
                        date: date,
                        full: false
                    }
                });

                return newSendList.id;

            }
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
            const addr = address == undefined ? sendOne.addr : address;

            //temp order에 데이터를 삽입해
            //order 수정 시에도 발송목록에서 순서가 변하지 않도록 조정
            console.log(id);
            console.log(sendListId);

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
                    addr: addr,
                    order: {
                        connect: { id: id }
                    },
                    patient: {
                        connect: { id: sendOne.patientId }
                    },
                    sendList: {
                        connect: { id: sendListId }
                    }
                }
            });

            return { success: true, id: res.id };

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
                const sendOne = await tx.order.update({
                    where: { id: orderId },
                    data: { isComplete: true }
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
                        type: { in: ['common', 'yoyo'] }
                    }
                });

                const orderAmount = orderItems.length;

                const sendList = await tx.sendList.findUnique({
                    where: { id: sendListId }
                });

                const amount = sendList.amount + orderAmount;

                await tx.sendList.update({
                    where: { id: sendListId },
                    data: { amount: amount }
                });

                const res = await this.createTempOrder(sendOne, orderId, sendListId, tx);
                if (res.success) return { success: true, status: HttpStatus.OK };
                else return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR }
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
     * 신규 환자 등록 용 엑셀
     * @param date
     * @returns {success:true,status:HttpStatus.OK,url};
     */
    async newPatientExcel(date: string) {
        try {
            //신환 :  이름 주소 주민번호 핸드폰번호 
            const { startDate, endDate } = getKstDate(date);

            console.log(startDate);
            console.log(endDate);
            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    consultingType: false,
                    isComplete: false,
                    isFirst: true,
                    date: {
                        gte: startDate,
                        lt: endDate,
                    }
                },
                select: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            phoneNum: true,
                            socialNum: true,
                        }
                    },
                    id: true,
                    addr: true,
                    route: true,
                }
            });

            console.log(list);

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("신환 등록");

            //const headers = ['이름', '주소', '주민번호', '휴대폰 번호'];
            const headers = ['주소', '주민번호', '이름', '휴대폰 번호', '설문지번호', '특이사항(추천인)'];

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
                    e.route
                ];
                const appendRow = sheet.addRow(rowDatas);
            });

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.uploadFile(fileData);

            return { success: true, status: HttpStatus.OK, url };
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
     * 엑셀 파일 업로드
     * @param file 
     * @returns fileUrl : String
     */
    async uploadFile(file: any) {
        try {
            const presignedUrl = await generateUploadURL();

            console.log(presignedUrl);
            await this.saveS3Data(presignedUrl.uploadURL, presignedUrl.imageName);

            await axios.put(presignedUrl.uploadURL, {
                body: file
            }, {
                headers: {
                    "Content-Type": file.type,
                }
            });

            let fileUrl = presignedUrl.uploadURL.split('?')[0];
            return fileUrl;
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
                    id: id
                },
                data: {
                    isComplete: true,
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
                }
            });
            if (res.length >= 1)
                return { success: true, check: true, status: HttpStatus.OK };
            else
                return { success: true, check: false, status: HttpStatus.OK };
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
     * 직원이 환자 order 업데이트
     * @param {UpdateSurveyDto, id}
     * @returns {success: boolean, status: HttpStatus.OK}
     */
    async updateOrderByStaff(updateSurveyDto, id) {
        try {
            const encryptedPhoneNum = this.crypto.encrypt(updateSurveyDto.patient.phoneNum);
            const encryptedAddr = this.crypto.encrypt(updateSurveyDto.addr);

            const patientData = { ...updateSurveyDto.patient, phoneNum: encryptedPhoneNum, addr: encryptedAddr };
            const orderItemsData = updateSurveyDto.orderItems.filter((item) => {
                return item.item !== '';
            });

            delete updateSurveyDto.patient;
            delete updateSurveyDto.orderItems;

            const items = orderItemsData.map((item) => ({
                item: item.item,
                type: item.type,
                orderId: id
            }));
            console.log(items);
            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(orderItemsData, itemList, updateSurveyDto.isPickup);
            const price = getOrderPrice.getPrice();
            let orderSortNum = updateSurveyDto.isPickup ? -1
                : updateSurveyDto.orderSortNum === -1 ? 0 : updateSurveyDto.orderSortNum;
            const orderData = { ...updateSurveyDto, price: price, orderSortNum: orderSortNum, addr: encryptedAddr };

            const res = await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.update({
                    where: {
                        id: id
                    },
                    data: orderData
                });

                const patient = await tx.patient.update({
                    where: {
                        id: patientData.id
                    },
                    data: patientData
                });

                const deleteItems = await tx.orderItem.deleteMany({
                    where: {
                        orderId: id
                    }
                });

                const insertItems = await tx.orderItem.createMany({
                    data: items
                });
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
     * 원장님이 환자 order 업데이트
     * @param {UpdateSurveyDto, id}
     * @returns {success: boolean, status: HttpStatus.OK}
     */
    async updateOrderByDoc(updateSurveyDto, id) {
        try {
            const encryptedPhoneNum = this.crypto.encrypt(updateSurveyDto.patient.phoneNum);
            const encryptedAddr = this.crypto.encrypt(updateSurveyDto.addr);

            const patientData = { ...updateSurveyDto.patient, phoneNum: encryptedPhoneNum, addr: encryptedAddr };
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
                orderId: id
            }));
            console.log(items);
            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(orderItemsData, itemList, updateSurveyDto.isPickup);
            const price = getOrderPrice.getPrice();
            const orderData = { ...updateSurveyDto, price: price, addr: encryptedAddr };

            const res = await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.update({
                    where: {
                        id: id
                    },
                    data: orderData
                });

                const patient = await tx.patient.update({
                    where: {
                        id: patientData.id
                    },
                    data: patientData
                });

                if (orderBodyTypeData !== null) {
                    const orderBodyType = await tx.orderBodyType.update({
                        where: {
                            orderId: id
                        },
                        data: orderBodyTypeData
                    });
                }

                const deleteItems = await tx.orderItem.deleteMany({
                    where: {
                        orderId: id
                    }
                });

                const insertItems = await tx.orderItem.createMany({
                    data: items
                });
            })
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
     * 입금 내역 엑셀 파일 업로드 및 발송목록으로 이동(부정확한 데이터 리턴)
     * @param insertCashDto 
     * @returns {success:boolean, url:string}
     */
    async cashExcel(insertCashDto: InsertCashDto) {
        try {
            //console.log(insertCashDto);
            const { startDate, endDate } = getKstDate(insertCashDto.date);
            const cashList = await this.getCashTypeList(startDate, endDate);
            const itemList = await this.getItems();
            //console.log(cashList);
            //console.log(insertCashDto);
            const cashMatcher = new CashExcel(insertCashDto.cashExcelDto, cashList.list, itemList);
            const results = cashMatcher.compare();

            console.log(results);
            //엑셀 생성
            const createExcel = await createExcelCash(results.duplicates, results.noMatches);
            const url = createExcel.url;
            const objectName = createExcel.objectName;

            await this.saveS3Data(url, objectName);

            // //발송목록 이동 처리 & cash column 업데이트(계좌이체로 금액 전부 결제한 사람들)
            results.matches.forEach(async (e) => {
                await this.completeConsulting(e.id);
                await this.cashUpdate(e.id, e.price);
            });
            return { success: true, url };
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

    /**item 테이블 데이터 가져오기 */
    async getItems() {
        try {
            const list = await this.prisma.item.findMany();

            return list;
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
                data: { cash: price }
            });

            return { success: true };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    async getCashTypeList(startDate, endDate) {
        try {
            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    consultingType: false,
                    isComplete: false,
                    payType: '계좌이체',
                    date: {
                        gte: startDate,
                        lt: endDate,
                    }
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
                        }
                    },
                    orderItems: {
                        select: {
                            id: true,
                            item: true,
                            type: true,
                        }
                    },
                }
            });

            return { success: true, list };
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
     * 가격 일괄 업데이트
     * @returns {success:boolean, status:number}
     */
    async updatePrice() {
        try {
            const itemList = await this.getItems();
            const list = await this.prisma.order.findMany({
                orderBy: {
                    id: "asc"
                },
                select: {
                    orderItems: true,
                    id: true
                }
            });

            console.log(list);
            list.forEach(async e => {
                console.log(e.id)

                const getOrderPrice = new GetOrderSendPrice(e.orderItems, itemList);
                const price = getOrderPrice.getPrice();
                console.log(e.id + ' / ' + price);
                await this.prisma.order.update({
                    where: { id: e.id }, data: { price: price }
                }).catch(err => (console.log(err)));

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
                        combineNum: true
                    }
                });

                let newCombineNum = (maxCombineNum._max.combineNum || 0) + 1;

                //새 combine order 삽입
                await tx.order.updateMany({
                    where: {
                        id: {
                            in: [...combineOrderDto.orderIdArr]
                        },
                        isComplete: false
                    },
                    data: {
                        combineNum: newCombineNum,
                        //기존 orderSortNum을 가져가야 되는 이슈가 생겨
                        //orderSortNum은 업데이트하지 않기로 하겠습니다.
                        // orderSortNum: 5 //orderSortNum update!
                    }
                });

                await tx.tempOrder.updateMany({
                    where: {
                        orderId: {
                            in: [...combineOrderDto.orderIdArr]
                        },
                        isComplete: false
                    },
                    data: {
                        orderSortNum: 5 //orderSortNum update!
                    }
                })

                //배송 주소 업데이트
                const patients = await tx.order.findMany({
                    where: {
                        id: {
                            in: combineOrderDto.orderIdArr
                        },
                        isComplete: false
                    },
                    select: {
                        patientId: true,
                    }
                });

                // for...of 루프를 사용하여 비동기 작업을 순차적으로 처리
                for (const e of patients) {
                    await tx.patient.update({
                        where: { id: e.patientId },
                        data: { addr: combineOrderDto.addr }
                    });
                };
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
                    where: { id: separateDto.orderId }
                });

                //orderSortNum 변경
                orderOne.orderSortNum = 6;

                const orderAmount = separateDto.separate.length;

                //발송목록 id
                const sendListId = await this.insertToSendList(tx, orderAmount);

                //분리배송 용 tempOrder 생성
                for (const e of separateDto.separate) {
                    if (e.sendTax) {
                        await tx.order.update({
                            where: { id: separateDto.orderId },
                            data: { price: orderOne.price + 3500 }
                        });
                    }
                    const res = await this.createTempOrder(orderOne, separateDto.orderId, sendListId, tx, e.addr);

                    if (!res.success) throw Error();
                    else {
                        await tx.tempOrderItem.create({
                            data: {
                                item: e.orderItem,
                                tempOrderId: res.id
                            }
                        });
                    }
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
            if (cancelOrderDto.isFirst) {
                //초진 일 시 환자 데이터까지 삭제
                const orderId = cancelOrderDto.orderId;
                const patientId = cancelOrderDto.patientId;

                await this.prisma.$transaction(async (tx) => {
                    //orderBodyType 삭제
                    await tx.orderBodyType.delete({
                        where: { orderId: orderId }
                    });

                    //orderItem 삭제
                    await tx.orderItem.deleteMany({
                        where: { orderId: orderId }
                    });

                    //order 삭제
                    await tx.order.delete({
                        where: { id: orderId }
                    });

                    //patient 삭제
                    await tx.patient.delete({
                        where: { id: patientId }
                    });

                });

                return { success: true, status: HttpStatus.OK, msg: '초진 삭제' }
            } else {
                //재진 일 시 환자 데이터는 가지고 있어야 되기 때문에 오더 정보만 삭제
                const orderId = cancelOrderDto.orderId;

                //오더만 isComplete를 true로 변경
                await this.prisma.order.update({
                    where: { id: orderId },
                    data: { isComplete: true }
                });

                return { success: true, status: HttpStatus.OK, msg: '재진 삭제' }

            }
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
                    objectName: objectName
                }
            });

            return { success: true };
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

    async getOutageList(getOutageListDto: GetListDto) {
        try {
            let orderConditions = {};
            if (getOutageListDto.date !== undefined) {
                //날짜 조건 O
                const { startDate, endDate } = getKstDate(getOutageListDto.date);

                orderConditions = {
                    date: {
                        gte: startDate,
                        lt: endDate,
                    }
                }
            }
            let patientConditions = {};
            if (getOutageListDto.searchKeyword !== "") {
                //검색어 O
                if (getOutageListDto.searchCategory === "all") {
                    patientConditions = {
                        OR: [
                            { patient: { name: { contains: getOutageListDto.searchKeyword } } },
                            { patient: { phoneNum: { contains: getOutageListDto.searchKeyword } } },
                        ]
                    }
                }
                else if (getOutageListDto.searchCategory === "name") {
                    patientConditions = {
                        patient: { name: { contains: getOutageListDto.searchKeyword } }
                    }
                }
                else if (getOutageListDto.searchCategory === "num") {
                    patientConditions = {
                        patient: { phoneNum: { contains: getOutageListDto.searchKeyword } }
                    }
                }
            }
            const list = await this.prisma.order.findMany({
                where: {
                    outage: {
                        not: '',
                    },
                    ...orderConditions,
                    ...patientConditions,
                    consultingType: false,
                    isComplete: false,
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

            const sortedList = sortItems(list);

            // 나중에 DB 데이터 암호화되면 여기 활성화
            // for (let row of sortedList) {
            //     const decryptedPhoneNume = this.crypto.decrypt(row.patient.phoneNum);
            //     const decryptedAddr = this.crypto.decrypt(row.addr);
            //     row.patient.phoneNum = decryptedPhoneNume;
            //     row.addr = decryptedAddr;
            // }

            return { success: true, list: sortedList };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    async updateAddr() {
        const res = await this.prisma.patient.findMany({
            select: { id: true, addr: true }
        });

        for (let i = 0; i < res.length; i++) {
            await this.prisma.order.updateMany({
                where: { patientId: res[i].id },
                data: { addr: res[i].addr }
            });
        }
    }
}
