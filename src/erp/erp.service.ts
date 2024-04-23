import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {  JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { SurveyAnswerDto } from './Dto/surveyAnswer.dto';
import { error } from 'console';
import { OrderObjDto } from './Dto/orderObj.dto';

@Injectable()
export class ErpService {
    constructor(
        private prisma : PrismaService,
        private jwtService : JwtService,
    ){}

    private readonly logger = new Logger(ErpService.name);

    /**
     * 초진 오더 접수
     * @param insertOrder 
     * @returns {success:boolean,status:number}
     */
    async insertFirstOrder(insertOrder:Array<SurveyAnswerDto>){
        try{
            //타입 설정 예정
            const objPatient:any = {};
            const objOrder:OrderObjDto = {
                route: '',
                message: '',
                cachReceipt: '',
                typeCheck: '',
                consultingTime: '',
                payType: ''
            };
            const objOrderBodyType:any = {};
            const objOrderItem:any = []

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
                        phoneNum : objPatient.phoneNum,
                        addr : objPatient.addr,
                        socialNum : parseInt(objPatient.socialNum)
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
                        patientId : patient.id
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



    async insertReturnOrder(insertOrder:Array<SurveyAnswerDto>){
        try{
            console.log(insertOrder);
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status:HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }
}
