import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Excel from 'exceljs'
import axios from 'axios';

import { PrismaService } from 'src/prisma.service';
import { SurveyAnswerDto } from './Dto/surveyAnswer.dto';
import { error } from 'console';
import { OrderObjDto } from './Dto/orderObj.dto';
import { CallConsultingDto } from './Dto/callConsulting.dto';
import { AdminService } from 'src/admin/admin.service';
import { SurveyDto } from './Dto/survey.dto';
import { PatientDto } from './Dto/patient.dto';
import { generateUploadURL } from '../util/s3';
import { createExcelCash, styleHeaderCell } from 'src/util/excelUtil';
import { UpdateSurveyDto } from './Dto/updateSurvey.dto';
import { checkGSB } from '../util/checkGSB.util';
import { GetListDto } from './Dto/getList.dto';
import { getItem } from 'src/util/getItem';
import { InsertCashDto } from './Dto/insertCash.dto';
import { CashExcel } from 'src/util/cashExcel';
import { getSendTitle } from 'src/util/getSendTitle';
import { GetOrderSendPrice } from 'src/util/getOrderPrice';
import { CompleteSetSendDto } from './Dto/completeSetSend.dto';
import { GetHyphen } from 'src/util/hyphen';

@Injectable()
export class ErpService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private adminService: AdminService,
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

            const itemList = await this.getItems();
            const getOrderPrice = new GetOrderSendPrice(objOrderItem,itemList);
            const price = getOrderPrice.getPrice();
            console.log(price);
            console.log('=====================');

            console.log(objOrder);
            console.log(objPatient);
            console.log(objOrderBodyType);
            console.log(objOrderItem);

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.create({
                    data: {
                        name: objPatient.name,
                        phoneNum: objPatient.phoneNum, //암호화 예정
                        addr: objPatient.addr, //암호화 예정
                        socialNum: objPatient.socialNum  //암호화 예정
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
                        price:price,
                        patientId: patient.id,
                        date: kstDate,
                        orderSortNum: checkGSB(objOrder.route) ? 4 : 0,
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
            if(getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    consultingType: false,
                    isComplete: false,
                }
            } else {
                //날짜 조건 O
                // 그리니치 천문대 표준시
                const gmtDate = new Date(getListDto.date);
                // 한국 시간으로 바꾸기
                const kstDate = new Date(gmtDate.getTime() + 9 * 60 * 60 * 1000);

                const startDate = new Date(kstDate.setHours(0,0,0,0));
                const endDate = new Date(kstDate.setHours(23,59,59,999));
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
            if(getListDto.searchKeyword !== "") {
                //검색어 O
                if(getListDto.searchCategory === "all"){
                    patientConditions = {
                        OR: [
                            { patient: { name: { contains: getListDto.searchKeyword } } },
                            { patient: { phoneNum: { contains: getListDto.searchKeyword } } },
                        ]
                    }
                }
                else if (getListDto.searchCategory === "name") {
                    patientConditions = {
                        patient: { name: {contains: getListDto.searchKeyword } }
                    }
                }
                else if (getListDto.searchCategory === "num") {
                    patientConditions = {
                        patient: { phoneNum: {contains: getListDto.searchKeyword } }
                    }
                }
            }
            const list = await this.prisma.order.findMany({
                where: {...orderConditions, ...patientConditions},
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
     * 재진 오더 접수
     * @param surveyDto 
     * @returns {success:boolean,status:number}
     */
    async insertReturnOrder(surveyDto: SurveyDto) {
        try {
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
            const getOrderPrice = new GetOrderSendPrice(objOrderItem,itemList);
            const price = getOrderPrice.getPrice();
            console.log(price);
            console.log('=====================');

            const patient = await this.checkPatient(objPatient)
            if (!patient.success) return { 
                success: false, 
                msg: '환자 정보가 없습니다. 입력 내역을 확인하거나 처음 접수시라면 초진 접수로 이동해주세요' 
            };

            await this.prisma.$transaction(async (tx) => {
                //주소가 달라졌을 시
                if (patient.patient.addr != objPatient.addr) {
                    await tx.patient.update({
                        where: {
                            id: patient.patient.id,
                        },
                        data: {
                            addr: objPatient.addr,
                            phoneNum: objPatient.phoneNum,
                        }
                    });
                }

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
                        price:price,
                        date: kstDate,
                        orderSortNum: checkGSB(objOrder.route) ? 4 : 0,
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.update({
                    where: {
                        id: token.patientId
                    },
                    data: {
                        addr: objPatient.addr
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
            const res = await this.prisma.patient.findFirst({
                where: {
                    name: objPatient.name,
                    socialNum: {
                        contains: objPatient.socialNum
                    }
                },
                select: {
                    id: true,
                    addr: true,
                }
            });



            if (!res) return { success: false };
            else return { success: true, patient: res };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
            if(getListDto.date === undefined) {
                //날짜 조건 X
                orderConditions = {
                    consultingType: true,
                    isComplete: false,
                }
            } else {
                //날짜 조건 O
                // 그리니치 천문대 표준시
                const gmtDate = new Date(getListDto.date);
                // 한국 시간으로 바꾸기
                const kstDate = new Date(gmtDate.getTime() + 9 * 60 * 60 * 1000);
                
                const startDate = new Date(kstDate.setHours(0,0,0,0));
                const endDate = new Date(kstDate.setHours(23,59,59,999));
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
            if(getListDto.searchKeyword === "") {
                //검색어 O
                if(getListDto.searchCategory === "all") {
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
                where: {...orderConditions, ...patientConditions},
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
            console.log(id);
            console.log(typeof id);
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

                //발송 목록 데이터 확인. 많이 나와봐야 두 개 임(이라고 생각했는데 fix 해제 요청 들어옴...)
                const sendList = await tx.sendList.findMany({
                    where: {
                        full: false,
                        fixFlag: false //픽스 여부 체크
                    },
                    orderBy:{
                        id:'asc'
                    },
                    select: {
                        id: true,
                        amount:true,
                        title:true,
                    }
                });

                console.log(sendList.length);

                //아직 350개 차지 않은 발송 목록이 있을 때
                if (sendList.length>0) {
                    const checkAmount = sendList[0].amount + orderAmount; //기존 발송목록과 추가되는 오더의 개수 더한거

                    if(checkAmount>350){
                        //350개가 넘으면 새로운 발송목록에 삽입
                        if(sendList.length==1){
                            //새로 삽입할 발송목록이 없어 새로 만들어야 될 때
                            const sendList = await tx.sendList.findMany({
                                orderBy:{
                                    id:'asc'
                                },
                                select: {
                                    id: true,
                                    amount:true,
                                    title:true,
                                }
                            }); //제일 마지막 발송일자 가져오기
                            const lastTitle = sendList[sendList.length-1].title;
                            const date = new Date(lastTitle);                            
                            const title = getSendTitle(date);
                            console.log(title);

                            const newSendList = await tx.sendList.create({
                                data:{
                                    title:title,
                                    amount:orderAmount,
                                    date:date,
                                    full:false
                                }
                            });

                            //새 발송목록에 데이터 넣기
                            const res = await this.createTempOrder(sendOne, id, newSendList.id, tx);
                            if(res.success) return {success:true,status:HttpStatus.OK};
                            else return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR};

                        }else{
                            //다 차지 않은 발송목록이 있어서 그냥 넣으면 될 때
                            await tx.sendList.update({
                                where:{
                                    id:sendList[1].id
                                },
                                data:{
                                    amount:checkAmount
                                }
                            });
                            const res = await this.createTempOrder(sendOne, id, sendList[1].id,tx);
                            if(res.success) return {success:true,status:HttpStatus.OK};
                            else return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR}
                        }
                    }else{
                        //350개 이하면 기존 발송목록에 삽입
                        const checkAmount = sendList[0].amount + orderAmount;

                        if(checkAmount == 350) {
                            await tx.sendList.update({
                                where:{
                                    id:sendList[0].id
                                },
                                data:{
                                    full:true,
                                    fixFlag:true, //350개 되면 자동으로 fix
                                }
                            });
                        }else{
                            await tx.sendList.update({
                                where:{
                                    id:sendList[0].id
                                },
                                data:{
                                    amount:checkAmount
                                }
                            })
                        }
                        const res = await this.createTempOrder(sendOne, id, sendList[0].id,tx);
                        if(res.success) return {success:true,status:HttpStatus.OK};
                        else return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR}
                    }
                } else {
                    //새로 발송목록을 만들어야 할 때
                    console.log('create new send list');
                    const sendList = await tx.sendList.findMany({
                        orderBy:{
                            id:'asc'
                        },
                        select: {
                            id: true,
                            amount:true,
                            title:true,
                        }
                    });//제일 마지막 발송일자 가져오기
                    console.log(sendList);
                    
                    const lastTitle = sendList.length != 0 ? sendList[sendList.length-1].title : new Date();
                    const date = new Date(lastTitle);
                    console.log(date);
                    const title = getSendTitle(date);
                    //console.log(title);
                    const newSendList = await tx.sendList.create({
                        data:{
                            title:title,
                            amount:orderAmount,
                            date:date,
                            full:false
                        }
                    });

                    //새 발송목록에 데이터 넣기
                    const res = await this.createTempOrder(sendOne, id, newSendList.id,tx);
                    if(res.success) return {success:true,status:HttpStatus.OK};
                    else return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR}
                }
            });


            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
    async createTempOrder(sendOne,id,sendListId,tx) {
        try{
            //temp order에 데이터를 삽입해
            //order 수정 시에도 발송목록에서 순서가 변하지 않도록 조정

            await tx.tempOrder.create({
                data:{
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
                    patientId: sendOne.patientId,
                    orderId: id,
                    sendListId:sendListId
                }
            });

            return {success:true};

        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
    async completeConsultingSetSend(completeSetSendDto: CompleteSetSendDto){
        try{
            const orderId = completeSetSendDto.orderId;
            const sendListId = completeSetSendDto.sendListId;

            await this.prisma.$transaction(async (tx) => {
                const sendOne = await tx.order.update({
                    where:{id:orderId},
                    data:{isComplete:true}
                });

                const orderItems = await tx.orderItem.findMany({
                    where:{
                        orderId: orderId,
                        type: {in: ['common','yoyo']}
                    }
                });

                const orderAmount = orderItems.length;

                const sendList = await tx.sendList.findUnique({
                    where:{id:sendListId}
                });

                const amount = sendList.amount+orderAmount;

                await tx.sendList.update({
                    where: {id: sendListId},
                    data:{amount:amount}
                });

                const res = await this.createTempOrder(sendOne,orderId,sendListId,tx);
                if(res.success) return {success:true,status:HttpStatus.OK};
                else return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR}
            });

            return {success:true, status: HttpStatus.OK};

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 신규 환자 등록 용 엑셀
     * @returns {success:true,status:HttpStatus.OK,url};
     */
    async newPatientExcel() {
        try {
            //신환 :  이름 주소 주민번호 핸드폰번호 

            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    consultingType: false,
                    isComplete: false,
                    isFirst: true,
                },
                select: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                            socialNum: true,
                        }
                    },
                    id:true,
                    route:true,
                }
            });

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("신환 등록");

            //const headers = ['이름', '주소', '주민번호', '휴대폰 번호'];
            const headers = ['주소', '주민번호','이름', '휴대폰 번호','설문지번호','특이사항(추천인)'];

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
                const { name, addr, socialNum, phoneNum } = e.patient;
                const rowDatas = [
                    addr,
                    hyphen.socialNumHyphen(socialNum) ,
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
    * 챠팅 용 엑셀
    * @returns {success:true,status:HttpStatus.OK,url};
    */
    async chatingExcel() {
        try {
            // 차팅 : 핸드폰번호 주문수량 결제방식 

            //날짜 조건 걸 예정
            const list = await this.prisma.order.findMany({
                select: {
                    patient: {
                        select: {
                            name: true,
                            phoneNum: true,
                        }
                    },
                    payType: true,
                    orderItems: {
                        select: {
                            item: true, 
                        }
                    }
                }
            });


            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("챠팅 엑셀");
            const header = ['이름', '핸드폰 번호', '주문수량', '결제방식'];
            const headerWidths = [16, 30, 40, 10];

            const headerRow = sheet.addRow(header);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            list.forEach((e) => {
                const { name, phoneNum } = e.patient;
                console.log(e.orderItems)
                let items='';

                for(let i =0; i<e.orderItems.length;i++){
                    console.log(e.orderItems[i].item)
                    const item = getItem(e.orderItems[i].item);
                    items+=`${item}/`
                }

                const payType = e.payType;

                const rowDatas = [name, phoneNum, items, payType];
                const appendRow = sheet.addRow(rowDatas);
            });

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.uploadFile(fileData);

            return { success: true, status: HttpStatus.OK, url };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }

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
            await axios.put(presignedUrl, {
                body: file
            }, {
                headers: {
                    "Content-Type": file.type,
                }
            });

            let fileUrl = presignedUrl.split('?')[0];
            return fileUrl;
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    async s3Url() {
        const url = await generateUploadURL();
        return { url };
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 직원이 환자 order 업데이트
     * @param {UpdateSurveyDto, id}
     * @returns {success: boolean, status: HttpStatus.OK}
     */
    async updateOrderByStaff(updateSurveyDto, id) {
        try{
            const patientData = updateSurveyDto.patient;
            const orderItemsData = updateSurveyDto.orderItems.filter((item) => {
                return item.item !== '';
            });

            delete updateSurveyDto.patient;
            delete updateSurveyDto.orderItems;

            const orderData = updateSurveyDto;
            const items = orderItemsData.map((item) => ({
                item: item.item,
                type: item.type,
                orderId: id
            }));
            console.log(items);

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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 원장님이 환자 order 업데이트
     * @param {UpdateSurveyDto, id}
     * @returns {success: boolean, status: HttpStatus.OK}
     */
    async updateOrderByDoc(updateSurveyDto, id) {
        try {
            const patientData = updateSurveyDto.patient;
            const orderItemsData = updateSurveyDto.orderItems.filter((item) => {
                return item.item !== '';
            });
            const orderBodyTypeData = updateSurveyDto.orderBodyType;

            delete updateSurveyDto.patient;
            delete updateSurveyDto.orderItems;
            delete updateSurveyDto.orderBodyType;

            const orderData = updateSurveyDto;
            const items = orderItemsData.map((item) => ({
                item: item.item,
                type: item.type,
                orderId: id
            }));
            console.log(items);

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

                if(orderBodyTypeData !== null) {
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
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 입금 내역 엑셀 파일 업로드 및 발송목록으로 이동(부정확한 데이터 리턴)
     * @param insertCashDto 
     * @returns {success:boolean, url:string}
     */
    async cashExcel(insertCashDto : Array<InsertCashDto>){
        try{    
            //console.log(insertCashDto);
            const cashList = await this.getCashTypeList();
            const itemList = await this.getItems();
            //console.log(cashList);
            console.log(insertCashDto);
            const cashMatcher = new CashExcel(insertCashDto,cashList.list, itemList);
            const results = cashMatcher.compare();

            console.log(results);
            //엑셀 생성
            const createExcel = await createExcelCash(results.duplicates,results.noMatches);
            const url = createExcel.url;

            //발송목록 이동 처리
            results.matches.forEach(async (e) => {
                await this.completeConsulting(e.id);
            });
            return {success:true, url};
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**item 테이블 데이터 가져오기 */
    async getItems(){
        try{
            const list = await this.prisma.item.findMany();

            return list;
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    async getCashTypeList() {
        try{
             //날짜 별 조회 추가 예정
             const list = await this.prisma.order.findMany({
                where: {
                    consultingType: false,
                    isComplete: false,
                    payType: '계좌이체'
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
                            id : true,
                            item: true,
                            type: true,
                        }
                    },
                }
            });

            return {success:true, list};
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 가격 일괄 업데이트
     * @returns {success:boolean, status:number}
     */
    async updatePrice(){
        try{
            const itemList = await this.getItems();
            const list = await this.prisma.order.findMany({
                orderBy:{
                    id:"asc"
                },
                select:{
                    orderItems:true,
                    id:true
                }
            });

            console.log(list);
            list.forEach(async e => {
                console.log(e.id)

                const getOrderPrice = new GetOrderSendPrice(e.orderItems,itemList);
                const price = getOrderPrice.getPrice();
                console.log(e.id +' / ' +price);
                await this.prisma.order.update({
                    where:{id:e.id},data:{price:price}
                }).catch(err =>(console.log(err)));
                  
            });

            return {success:true,status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

}
