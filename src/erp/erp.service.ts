import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { SurveyAnswerDto } from './Dto/surveyAnswer.dto';
import { error } from 'console';
import { OrderObjDto } from './Dto/orderObj.dto';
import { CallConsultingDto } from './Dto/callConsulting.dto';
import { AdminService } from 'src/admin/admin.service';
import { SurveyDto } from './Dto/survey.dto';
import { PatientDto } from './Dto/patient.dto';
import { generateUploadURL } from '../util/s3';
import * as Excel from 'exceljs'
import { styleHeaderCell } from 'src/util/excelUtil';
import axios from 'axios';
import { UpdateSurveyDto } from './Dto/updateSurvey.dto';

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
            const date = surveyDto.date;
            console.log(date);
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
                        patientId: patient.id,
                        date: new Date(date.toString()),
                        orderSortNum: this.checkGSB(objOrder.route) ? 4 : 0,
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
    async getReciptList() {
        try {
            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    consultingType: false,
                    isComplete:false,
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
            const insertOrder = surveyDto.answers;
            const date = surveyDto.date;

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

            const patient = await this.checkPatient(objPatient)
            if (!patient.success) return { success: false, msg: '환자 정보가 없습니다. 입력 내역을 확인하거나 처음 접수시라면 초진 접수로 이동해주세요' };

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
                        date: new Date(date),
                        orderSortNum: this.checkGSB(objOrder.route) ? 4 : 0,
                    }
                });

                console.log(objOrderItem);
                console.log('--------------------');
                const items = [];

                for (let i = 0; i < objOrderItem.length; i++) {
                    let tempObj = objOrderItem[i];
                    let temp = {}

                    if (tempObj.type=='assistant') {
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
    async getCallList(header: string) {
        try {
            //등급 조회
            const checkAdmin = await this.adminService.checkAdmin(header);
            if (!checkAdmin.success) return { success: false, status: HttpStatus.FORBIDDEN, msg: '권한이 없습니다' };

            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    consultingType: true,
                    isComplete: false,
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
    async completeConsulting(id:number){
        try{
            const sendOne = await this.prisma.order.update({
                where:{
                    id:id
                },
                data:{
                    isComplete:true,
                }
            });

            await this.prisma.tempOrder.create({
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
                    orderId: id
                }
            })

            return { success: true, status: HttpStatus.OK };
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
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
                }
            });

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("신환 등록");

            const headers = ['이름', '주소', '주민번호', '휴대폰 번호'];
            const headerWidths = [16, 40, 30, 20];

            //상단 헤더 추가
            const headerRow = sheet.addRow(headers);
            //헤더의 높이값 지정
            headerRow.height = 30.75;
            // 각 헤더 cell에 스타일 지정
            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            //각 data cell에 데이터 삽입
            list.forEach((e) => {
                const { name, addr, socialNum, phoneNum } = e.patient;
                const rowDatas = [name, addr, socialNum, phoneNum];
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
                const items = e.orderItems.join('/');
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
            //this.logger.error(err);
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

    /**
     * 설문 경로 구수방 체크
     */
    checkGSB = (route: string) => {
        const keywords = ['구수방', '구미수다방', '구미맘카페', '구미맘'];
        return keywords.includes(route);
    }

}
