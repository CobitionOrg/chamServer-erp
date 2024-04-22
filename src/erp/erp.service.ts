import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {  JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { SurveyAnswerDto } from './Dto/surveyAnswer.dto';
import { error } from 'console';

@Injectable()
export class ErpService {
    constructor(
        private prisma : PrismaService,
        private jwtService : JwtService,
    ){}

    private readonly logger = new Logger(ErpService.name);

    async insertFirstOrder(insertOrder:Array<SurveyAnswerDto>){
        try{
            const objPatient = {};
            const objOrder = {};
            const objOrderBodyType = {};
            const objOrderItem = {}

            insertOrder.forEach(e=>{
                console.log(e)
                if(e.orderType == 'order'){
                    objOrder[`${e.code}`] = e.answer;
                }else if(e.orderType == 'patient'){
                    objPatient[`${e.code}`] = e.answer;
                }else if(e.orderType == 'orderItem'){
                    objOrderItem[`${e.code}`] = e.answer;
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
