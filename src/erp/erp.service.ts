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
                        date: new Date(date.toString())
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
            console.log(date);

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
                    }
                });

                console.log(objOrderItem);
                console.log('--------------------');
                const items = [];

                for (let i = 0; i < objOrderItem.length; i++) {
                    let tempObj = objOrderItem[i];
                    for (let j = 0; j < tempObj.item.length; j++) {
                        const temp = {
                            item: tempObj.item[j],
                            type: tempObj.type,
                            orderId: order.id
                        }
                        items.push(temp);
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
    async getCallList(header:string) {
        try {
            //등급 조회
            const checkAdmin = await this.adminService.checkAdmin(header);
            if(!checkAdmin.success) return {success:false, status:HttpStatus.FORBIDDEN, msg: '권한이 없습니다'};

            //날짜 별 조회 추가 예정
            const list = await this.prisma.order.findMany({
                where: {
                    consultingType: true,
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
                    orderBodyType:{
                        select:{
                            tallWeight:true,
                            digestion:true,
                            sleep:true,
                            constipation:true,
                            nowDrug:true,
                            pastDrug:true,
                            pastSurgery:true,
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
}
