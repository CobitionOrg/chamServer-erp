import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {  JwtService } from '@nestjs/jwt';
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
        private prisma : PrismaService,
        private jwtService : JwtService,
        private adminService : AdminService,
    ){}

    private readonly logger = new Logger(ErpService.name);

    /**
     * 초진 오더 접수
     * @param insertOrder 
     * @returns {success:boolean,status:number}
     */
    async insertFirstOrder(surveyDto:SurveyDto){
        try{
            const insertOrder = surveyDto.answers;
            const date = surveyDto.date;
            //타입 설정 예정
            const objPatient:any = {}; //환자 정보
            const objOrder:OrderObjDto = {
                route: '',
                message: '',
                cachReceipt: '',
                typeCheck: '',
                consultingTime: '',
                payType: ''
            };//오더 정보
            const objOrderBodyType:any = {}; //초진 시 건강 응답 정보
            const objOrderItem:any = [] //오더 아이템 정보

            insertOrder.forEach(e=>{
                console.log(e)
                if(e.orderType == 'order'){
                    objOrder[`${e.code}`] = e.answer;
                }else if(e.orderType == 'patient'){
                    objPatient[`${e.code}`] = e.answer;
                }else if(e.orderType == 'orderItem'){
                    const obj = {
                        item:e.answer,
                        type:e.code
                    }
                    objOrderItem.push(obj);
                }else if(e.orderType == 'orderBodyType'){
                    objOrderBodyType[`${e.code}`] = e.answer;
                }else{
                    throw error('400 error');
                }
            });

            console.log(objOrder);
            console.log(objPatient);
            console.log(objOrderBodyType);
            console.log(objOrderItem);

            await this.prisma.$transaction(async (tx) =>{
                const patient = await tx.patient.create({
                    data:{
                        name : objPatient.name,
                        phoneNum : objPatient.phoneNum, //암호화 예정
                        addr : objPatient.addr, //암호화 예정
                        socialNum : objPatient.socialNum  //암호화 예정
                    }
                });
                const order = await tx.order.create({
                   data:{
                        route:objOrder.route,
                        message:objOrder.message,
                        cachReceipt:objOrder.cachReceipt,
                        typeCheck:objOrder.typeCheck,
                        consultingTime: objOrder.consultingTime,
                        payType : objOrder.payType,
                        essentialCheck:'',
                        outage:'',
                        isFirst:true,
                        patientId : patient.id,
                        date: new Date(date)
                   }
                });

                const orderBodyType = await tx.orderBodyType.create({
                    data:{
                        tallWeight:objOrderBodyType.tallWeight,
                        digestion:objOrderBodyType.digestion.join('/'),
                        sleep:objOrderBodyType.sleep.join('/'),
                        constipation:objOrderBodyType.constipation.join('/'),
                        nowDrug:objOrderBodyType.nowDrug.join('/'),
                        pastDrug:objOrderBodyType.pastDrug.join('/'),
                        pastSurgery:objOrderBodyType.pastSurgery.join('/'),
                        orderId:order.id,
                    }
                });

                const items = objOrderItem.map((item) => ({
                    item:item.item,
                    type:item.type,
                    orderId:order.id
                 }));

                const orderItem =await tx.orderItem.createMany({
                    data:items
                });
            });

            return {success:true,status:HttpStatus.CREATED};

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 이거 뭐하려 했더라...
     * @returns 
     */
    async getReciptList(){
        try{

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }


    async insertReturnOrder(surveyDto : SurveyDto){
        try{
            const insertOrder = surveyDto.answers;
            const date = surveyDto.date;

            console.log(insertOrder);
            console.log(date);

            const objPatient:PatientDto = {
                name: '',
                socialNum: '',
                addr: '',
                phoneNum: ''
            };
            const objOrder:any = {};
            const objOrderBodyType:any={};
            const objOrderItem:any={};

            insertOrder.forEach(e=>{
                if(e.orderType == 'order'){
                    objOrder[`${e.code}`] = e.answer;
                }else if(e.orderType == 'patient'){
                    objPatient[`${e.code}`] = e.answer;
                }else if(e.orderType == 'orderItem'){
                    const obj = {
                        item:e.answer,
                        type:e.code
                    }
                    objOrderItem.push(obj);
                }else if(e.orderType == 'orderBodyType'){
                    objOrderBodyType[`${e.code}`] = e.answer;
                }else{
                    throw error('400 error');
                }
            });

            const patientId = await this.checkPatient(objPatient.name, objPatient.socialNum)

        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 환자 정보 찾기
     * @param name 
     * @param socialNum 
     * @returns {success:boolean,id:number}
     */
    async checkPatient(name:string,socialNum:string){
        try{
         

            const res = await this.prisma.patient.findFirst({
                where:{
                    name:name,
                    socialNum:{
                        contains:socialNum
                    }
                },
                select:{
                    id:true,
                }
            });


            if(!res) return {success:false};
            else return {success:true,id:res.id};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 유선 상담 목록으로 이동
     * @param callConsultingDto 
     * @returns {success:boolean,status:number}
     */
    async callConsulting(callConsultingDto : CallConsultingDto){
        try{
            await this.prisma.order.update({
                where:{
                    id:callConsultingDto.orderId,
                    patientId:callConsultingDto.userId
                },
                data:{
                    consultingType : true,
                }
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 유선 상담 완료 처리
     * @param callConsultingDto 
     * @returns {success:boolean,status:number}
     */
    async callComplete(callConsultingDto : CallConsultingDto,header:string){
        try{
            const checkAdmin = await this.adminService.checkAdmin(header);
            if(!checkAdmin.success) return {success:false,status:HttpStatus.FORBIDDEN}; //일반 유저 거르기

            //유선 상담 완료 처리
            await this.prisma.order.update({
                where:{
                    id:callConsultingDto.orderId,
                    patientId:callConsultingDto.userId
                },
                data:{
                    consultingType : false,
                    phoneConsulting : true,
                }
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }
}
